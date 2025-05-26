/**
 * Application assembly module
 * High-level factory methods and application setup
 */

import { createServerConfig, loadEnvironmentConfig } from './config.ts';
import type { ServerOptions, TransportType } from './config.ts';
// ServerFactoryOverrides type - matches what ConfigurationBuilder.withOverrides expects
interface ServerFactoryOverrides {
  readonly spec?: string;
  readonly port?: number;
  readonly headers?: Headers;
  readonly transport?: TransportType;
  readonly baseUrl?: string;
}
import { createAppContext } from './logging.ts';
import { OpenApiSpec } from './openapi.ts';
import type { OpenApiSpecOptions } from './openapi.ts';
import { QuickMcpServer } from './server.ts';


export type { OpenApiSpecOptions };

/**
 * Create a QuickMcpServer instance from options
 */
export async function createServer(options: ServerOptions): Promise<QuickMcpServer> {
  const spec = await OpenApiSpec.load(options.spec, {
    app: options.app,
    ...(options.baseUrl && { baseUrl: options.baseUrl }),
  });

  return new QuickMcpServer({ ...options, spec });
}

/**
 * Create QuickMcpServer instance from environment variables (12-factor app)
 * Perfect for Heroku deployment
 */
export async function createServerFromEnvironment(
  overrides: ServerFactoryOverrides = {}
): Promise<QuickMcpServer> {
  const env = loadEnvironmentConfig();
  
  const app = createAppContext(env.LOG_LEVEL ?? 'info');

  const options = createServerConfig(app, overrides);

  return createServer(options);
}