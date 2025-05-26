/**
 * HTTP Transport implementation for Quick-MCP
 */

import { randomUUID } from 'crypto';
import type { Server } from 'http';
import type { UUID } from 'node:crypto';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import express from 'express';
import type { Request, Response, Express } from 'express';

import { transportNotConnectedError, httpServerError, httpServerFailedError } from '../errors/index.ts';

import type { TransportAdapter, TransportInfo, TransportOptions } from './index.ts';

/**
 * HTTP Transport adapter for MCP servers
 */
export class HttpTransport implements TransportAdapter {
  #transport?: StreamableHTTPServerTransport;
  #app?: Express;
  #server?: Server;
  readonly #options: TransportOptions;

  constructor(options: TransportOptions) {
    this.#options = options;
  }

  async connect(mcpServer: McpServer): Promise<void> {
    // Create the transport with session management
    this.#transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: (): UUID => randomUUID(),
    });

    // Connect MCP server to transport
    await mcpServer.connect(this.#transport as Transport);
  }

  start(onReady?: (info: TransportInfo) => void): Promise<void> {
    if (!this.#transport) {
      return Promise.reject(transportNotConnectedError());
    }

    const { app: appContext, port = 8080 } = this.#options;
    const log = appContext.log;

    return new Promise((resolve, reject) => {
      try {
      // Create Express app
      this.#app = express();
      this.#app.use(express.json());

      // Set up routes for streamable HTTP
      this.#app.post('/mcp', (req: Request, res: Response) => {
        if (this.#transport) {
          void this.#transport.handleRequest(req, res, req.body);
        }
      });

      // Handle GET requests for server-to-client notifications via SSE
      this.#app.get('/mcp', (req: Request, res: Response) => {
        if (this.#transport) {
          void this.#transport.handleRequest(req, res);
        }
      });

      // Handle DELETE requests for session termination
      this.#app.delete('/mcp', (req: Request, res: Response) => {
        if (this.#transport) {
          void this.#transport.handleRequest(req, res);
        }
      });

      const host = process.env['NODE_ENV'] === 'production' ? '0.0.0.0' : 'localhost';

        // Start express server with proper host binding for Heroku
        this.#server = this.#app.listen(port, host, () => {
          const url = `http://${host}:${port}/mcp`;
          log.info(`MCP proxy server started at ${url}`);
          log.info('Use this URL for your MCP client configuration');

          if (onReady) {
            onReady({
              type: 'http',
              url,
              port,
              host,
            });
          }
          
          resolve();
        });

        // Add error handling for the server
        this.#server.on('error', (err: Error) => {
          log.error(`HTTP server error: ${err.message}`);
          reject(httpServerError(err));
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.stack : String(err);
        log.error(`Failed to start HTTP server: ${errorMessage}`);
        reject(httpServerFailedError(port, err));
      }
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.#server) {
        this.#server.close((err: Error | undefined) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}