/**
 * STDIO Transport implementation for Quick-MCP
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import type { TransportAdapter, TransportInfo, TransportOptions } from './index.ts';

/**
 * STDIO Transport adapter for MCP servers
 */
export class StdioTransport implements TransportAdapter {
  #transport?: StdioServerTransport;
  readonly #options: TransportOptions;

  constructor(options: TransportOptions) {
    this.#options = options;
  }

  async connect(mcpServer: McpServer): Promise<void> {
    // Create stdio transport
    this.#transport = new StdioServerTransport();
    
    // Connect MCP server to transport
    await mcpServer.connect(this.#transport);
  }

  start(onReady?: (info: TransportInfo) => void): Promise<void> {
    const log = this.#options.app.log;
    
    log.info('MCP proxy server started on standard I/O');
    
    if (onReady) {
      onReady({
        type: 'stdio',
      });
    }
    
    return Promise.resolve();
  }

  async stop(): Promise<void> {
    // STDIO transport doesn't need explicit cleanup
    return Promise.resolve();
  }
}