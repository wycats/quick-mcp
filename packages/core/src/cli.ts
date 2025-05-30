/**
 * CLI interface for Quick-MCP
 */

import { Command, Option } from '@commander-js/extra-typings';

import { createServer, createServerFromEnvironment } from './app.ts';
import { collectHeader } from './config.ts';
import type { TransportType } from './config.ts';
import { createAppContext } from './logging.ts';
import { validatePort, validateSpecUrl } from './types.ts';


// Define the version from package.json
const version = '0.1.0';

/**
 * Create the CLI command for Quick-MCP
 */
export function createCLI(): Command {
  const program = new Command()
    .name('quick-mcp')
    .description('A dynamic proxy that converts OpenAPI endpoints into MCP tools on the fly')
    .version(version)
    .addOption(
      new Option('-s, --spec <path>', 'Path or URL to OpenAPI specification').makeOptionMandatory(),
    )
    .option('-b, --base-url <url>', 'Base URL for the API (overrides the one in the spec)')
    .addOption(
      new Option('-p, --port <number>', 'Port for the MCP server')
        .argParser((value) => parseInt(value, 10))
        .default(8080),
    )
    .addOption(
      new Option('-H, --header <header>', 'Add custom header to all requests (format: "Name: Value")')
        .argParser(collectHeader)
        .default(new Headers()),
    )
    .addOption(
      new Option('-l, --log-level <level>', 'Log level')
        .choices(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
        .default('warn'),
    )
    .addOption(
      new Option('-t, --transport <type>', 'Transport type')
        .choices(['http', 'stdio'] as const)
        .default('http' as TransportType),
    )
    .addOption(
      new Option('--timeout <ms>', 'Request timeout in milliseconds')
        .argParser((value) => parseInt(value, 10))
        .default(30000),
    )
    .option('--env', 'Load configuration from environment variables (12-factor app mode)')
    .action(async (options) => {
      const server = options.env
        ? // Load from environment variables (12-factor app mode)
          await createServerFromEnvironment({
            ...(options.spec ? { spec: validateSpecUrl(options.spec) } : {}),
            ...(options.port ? { port: validatePort(options.port) } : {}),
            headers: options.header,
            transport: options.transport,
            ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
            ...(options.timeout ? { requestTimeoutMs: options.timeout } : {}),
          })
        : // Traditional CLI mode
          await createServer({
            app: createAppContext(options.logLevel),
            transport: options.transport,
            spec: validateSpecUrl(options.spec),
            port: validatePort(options.port),
            headers: options.header,
            ...(options.baseUrl && { baseUrl: options.baseUrl }),
            ...(options.timeout && { requestTimeoutMs: options.timeout }),
          });

      // Start the proxy server with the chosen transport
      await server.start();
    });

  return program;
}

// Parse CLI arguments if this is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const program = createCLI();
  program.parse();
}