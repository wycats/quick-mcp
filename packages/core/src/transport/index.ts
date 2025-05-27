/**
 * Transport layer abstractions for Quick-MCP
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { AppContext } from '../logging.ts';

/**
 * Configuration options for transport adapters
 */
export interface TransportOptions {
  readonly app: AppContext;
  readonly port?: number;
}

/**
 * Abstract interface for transport adapters
 */
export interface TransportAdapter {
  /**
   * Connect the MCP server to this transport
   */
  connect(server: McpServer): Promise<void>;

  /**
   * Start listening for connections
   */
  start(onReady?: (info: TransportInfo) => void): Promise<void>;

  /**
   * Stop the transport and clean up resources
   */
  stop(): Promise<void>;
}

/**
 * Information about the started transport
 */
export interface TransportInfo {
  readonly type: 'http' | 'stdio';
  readonly url?: string;
  readonly port?: number;
  readonly host?: string;
}

// Export transport implementations
export { HttpTransport } from './http.ts';
export { StdioTransport } from './stdio.ts';
export { createTransport } from './factory.ts';
export type { TransportType } from '../config.ts';

