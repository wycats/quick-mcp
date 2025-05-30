import type { CallToolResult, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import type { LogLayer } from 'loglayer';
import type { Operation } from 'oas/operation';
import type { z } from 'zod';

import { requestTimeoutError, networkRequestError } from './errors/index.ts';
import { CustomExtensions } from './operation/custom-extensions.ts';
import type { CustomExtensionsInterface } from './operation/custom-extensions.ts';
import { QuickMcpOperation } from './operation/ext.ts';
import { buildRequest } from './request/request-builder.ts';
import { handleToolResponse, handleResourceResponse } from './response/response-handler.ts';

export type IntoOperationExtensions = CustomExtensionsInterface | CustomExtensions;
export type PathOperation = Operation;

type InvokeResult = CallToolResult | ReadResourceResult;

/**
 * Client for invoking operations as tool calls
 */
export class OperationClient<T extends InvokeResult = InvokeResult> {
  static tool(app: { log: LogLayer }, operation: QuickMcpOperation): OperationClient<CallToolResult> {
    return new OperationClient(app, operation, async (response) => {
      return handleToolResponse(response, app.log, operation);
    });
  }

  static resource(
    app: { log: LogLayer },
    operation: QuickMcpOperation,
  ): OperationClient<ReadResourceResult> {
    return new OperationClient(app, operation, async (response) => {
      return handleResourceResponse(response, app.log, operation);
    });
  }

  readonly #app: { log: LogLayer };
  readonly #operation: QuickMcpOperation;

  readonly #invoke: (response: Response) => Promise<T>;

  private constructor(
    app: { log: LogLayer },
    operation: QuickMcpOperation,
    invoke: (response: Response) => Promise<T>,
  ) {
    this.#app = app;
    this.#operation = operation;
    this.#invoke = invoke;
  }

  get op(): QuickMcpOperation {
    return this.#operation;
  }

  toResource(): OperationClient<ReadResourceResult> {
    return OperationClient.resource(this.#app, this.#operation);
  }

  /**
   * Invokes the operation as a tool call
   * @param args The arguments to pass to the operation
   * @param bearerToken Optional bearer token for authentication
   * @returns A CallToolResult object representing the response
   */
  async invoke(
    args: z.objectOutputType<z.ZodRawShape, z.ZodTypeAny>,
    bearerToken?: string,
    timeoutMs?: number,
  ): Promise<T> {
    const response = await executeRequest(this.#operation, this.#app, args, bearerToken, timeoutMs);

    return this.#invoke(response);
  }
}

/**
 * Creates the appropriate client for an operation
 * @param operation The operation to create a client for
 * @param extensions Custom extensions for the operation
 * @param options Application options including logging
 * @returns A ResourceClient, OperationClient, or null if the operation is invalid
 */
export function createClient(
  operation: PathOperation,
  extensions: IntoOperationExtensions,
  options: { log: LogLayer },
): OperationClient {
  const ext = CustomExtensions.of(extensions);
  const quickMcpOperation = QuickMcpOperation.from(operation, ext, options);

  if (quickMcpOperation.isResource) {
    return OperationClient.resource(options, quickMcpOperation);
  } else {
    return OperationClient.tool(options, quickMcpOperation);
  }
} /**
 * Executes a network request with the given arguments and returns the raw response
 */

export async function executeRequest(
  operation: QuickMcpOperation,
  app: { log: LogLayer },
  args: z.objectOutputType<z.ZodRawShape, z.ZodTypeAny>,
  bearerToken?: string,
  timeoutMs = 30000, // Default 30 second timeout
): Promise<Response> {
  const request = buildRequest(app, operation, args, bearerToken);
  
  // Create an AbortController for timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  
  try {
    const response = await fetch(request, {
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw requestTimeoutError(
        {
          id: operation.id,
          method: operation.verb.uppercase,
          path: operation.path,
        },
        timeoutMs
      );
    }
    
    throw networkRequestError(
      {
        id: operation.id,
        method: operation.verb.uppercase,
        path: operation.path,
      },
      error
    );
  }
}
