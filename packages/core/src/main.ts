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

// Import CLI for conditional execution
import { createCLI } from './cli.ts';


// CLI bootstrap - only run if this file is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  const program = createCLI();
  program.parse();
}