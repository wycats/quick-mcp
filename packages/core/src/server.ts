/**
 * MCP Server orchestration module
 * Handles the core server functionality and lifecycle
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { LogLayer } from 'loglayer';

import type { ServerOptions } from './config.ts';
import { serverStartupFailedError, getErrorStack } from './errors/index.ts';
import type { OpenApiSpec } from './openapi.ts';
import { createTransport } from './transport/index.ts';


// Define the version from package.json
const version = '0.1.0';

type QuickMcpServerState = Omit<ServerOptions, 'spec'> & { spec: OpenApiSpec };

/**
 * Quick-MCP Server class
 * Manages the MCP server lifecycle and orchestration
 */
export class QuickMcpServer {
  // Private class properties
  readonly #server: McpServer;
  readonly #state: QuickMcpServerState;

  /**
   * Create a new Quick-MCP server
   */
  constructor(options: QuickMcpServerState) {
    // Initialize state first
    this.#state = options;
    
    // Initialize the MCP server
    this.#server = new McpServer({
      name: 'Quick-MCP Proxy',
      version,
    });


    // Log startup configuration for debugging
    this.#state.app.log.info('Quick-MCP starting with configuration:', JSON.stringify({
      transport: options.transport,
      port: options.port,
      spec: options.spec.spec.url(),
      hasBaseUrl: !!options.baseUrl,
      headerCount: Array.from(options.headers.entries()).length,
    }));
  }

  get #log(): LogLayer {
    return this.#state.app.log;
  }

  /**
   * Start the MCP server
   */
  public async start(): Promise<void> {
    try {
      this.#state.spec.createResources(this.#server);
      this.#state.spec.createTools(this.#server);

      // Create transport based on configuration
      const transport = createTransport(this.#state.transport, {
        app: this.#state.app,
        port: this.#state.port,
      });

      // Connect MCP server to transport
      await transport.connect(this.#server);

      // Start the transport
      await transport.start((info) => {
        if (info.url) {
          this.#log.info(`MCP proxy server started at ${info.url}`);
          this.#log.info('Use this URL for your MCP client configuration');
        } else {
          this.#log.info('MCP proxy server started on standard I/O');
        }

        // Log simple count of exposed tools
        const tools = this.#state.spec.getTools();
        const resources = this.#state.spec.getResources();
        this.#log.info(`Exposing ${tools.length} tools and ${resources.length} resources`);
      });
    } catch (error) {
      const errorMessage = getErrorStack(error) ?? String(error);
      this.#log.error(`Failed to start server: ${errorMessage}`);
      throw serverStartupFailedError(error);
    }
  }
}