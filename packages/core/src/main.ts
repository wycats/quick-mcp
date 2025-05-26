/**
 * Quick-MCP: Convert OpenAPI specifications into MCP servers
 * 
 * Main entry point - exports the public API
 */

// Export core server class
export { QuickMcpServer } from './server.ts';

// Export application factory functions
export { createServer, createServerFromEnvironment } from './app.ts';

// Export types that are part of the public API
export type { ServerOptions } from './config.ts';
export type { OpenApiSpecOptions } from './openapi.ts';

// Export OpenApiSpec for advanced use cases
export { OpenApiSpec } from './openapi.ts';

// Re-export the legacy QuickMCP class for backward compatibility
import { createServer, createServerFromEnvironment } from './app.ts';
import type { ServerOptions } from './config.ts';
import { QuickMcpServer } from './server.ts';

/**
 * Legacy QuickMCP class for backward compatibility
 * @deprecated Use createServer() or QuickMcpServer directly
 */
/* eslint-disable @typescript-eslint/no-deprecated */
export class QuickMCP extends QuickMcpServer {
  /**
   * @deprecated Use createServer() function instead
   */
  static async load(options: ServerOptions): Promise<QuickMCP> {
    const server = await createServer(options);
    return Object.setPrototypeOf(server, QuickMCP.prototype) as QuickMCP;
  }

  /**
   * @deprecated Use createServerFromEnvironment() function instead
   */
  static async fromEnvironment(overrides: Parameters<typeof createServerFromEnvironment>[0] = {}): Promise<QuickMCP> {
    const server = await createServerFromEnvironment(overrides);
    return Object.setPrototypeOf(server, QuickMCP.prototype) as QuickMCP;
  }
}
/* eslint-enable @typescript-eslint/no-deprecated */

// CLI bootstrap - only run if this file is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  const { createCLI } = await import('./cli.ts');
  const program = createCLI();
  program.parse();
}