/**
 * Configuration module for Quick-MCP
 * 
 * Handles environment variables, CLI arguments, and server options
 * following the 12-factor app principles.
 */

import type { LiteralUnion } from 'type-fest';

import { missingSpecError, createConfigurationError } from './errors/index.ts';
import type { AppContext } from './logging.ts';
import type { Port, SpecUrl } from './types.ts';
import { validatePort, validateSpecUrl, getDefaultPort } from './types.ts';

export type TransportType = LiteralUnion<'http' | 'stdio', string>;
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Environment configuration for 12-factor app compliance
 */
export interface EnvironmentConfig {
  readonly PORT?: string;
  readonly OPENAPI_SPEC_URL?: string;
  readonly BASE_URL?: string;
  readonly LOG_LEVEL?: LogLevel;
  readonly TRANSPORT?: TransportType;
  readonly AUTH_HEADERS?: string;
  readonly REQUEST_TIMEOUT_MS?: string;
}

/**
 * Complete server configuration options
 */
export interface ServerOptions {
  readonly app: AppContext;
  readonly spec: SpecUrl;
  readonly port: Port;
  readonly headers: Headers;
  readonly transport: TransportType;
  readonly baseUrl?: string;
  readonly requestTimeoutMs?: number;
}

/**
 * Configuration override options (all optional)
 */
export interface ConfigOverrides {
  readonly app?: AppContext;
  readonly spec?: string;
  readonly port?: number;
  readonly headers?: Headers;
  readonly transport?: TransportType;
  readonly baseUrl?: string;
  readonly requestTimeoutMs?: number;
}

/**
 * Load configuration from environment variables (12-factor app)
 */
export function loadEnvironmentConfig(): EnvironmentConfig {
  return {
    ...(process.env['PORT'] && { PORT: process.env['PORT'] }),
    ...(process.env['OPENAPI_SPEC_URL'] && { OPENAPI_SPEC_URL: process.env['OPENAPI_SPEC_URL'] }),
    ...(process.env['BASE_URL'] && { BASE_URL: process.env['BASE_URL'] }),
    ...(process.env['LOG_LEVEL'] && { LOG_LEVEL: process.env['LOG_LEVEL'] as LogLevel }),
    ...(process.env['TRANSPORT'] && { TRANSPORT: process.env['TRANSPORT'] as TransportType }),
    ...(process.env['AUTH_HEADERS'] && { AUTH_HEADERS: process.env['AUTH_HEADERS'] }),
    ...(process.env['REQUEST_TIMEOUT_MS'] && { REQUEST_TIMEOUT_MS: process.env['REQUEST_TIMEOUT_MS'] })
  };
}

/**
 * Create ServerOptions from environment + overrides
 */
export function createServerConfig(
  app: AppContext,
  overrides: ConfigOverrides = {}
): ServerOptions {
  const env = loadEnvironmentConfig();
  
  // Determine spec URL
  const specUrl = overrides.spec ?? env.OPENAPI_SPEC_URL;
  if (!specUrl) {
    throw missingSpecError();
  }
  
  // Determine port
  const portInput = overrides.port ?? (env.PORT ? Number(env.PORT) : getDefaultPort());
  const port = validatePort(portInput);
  
  // Create headers (environment + overrides)
  const headers = new Headers();
  
  // Add environment auth headers if present
  if (env.AUTH_HEADERS) {
    parseAuthHeaders(env.AUTH_HEADERS, headers);
  }
  
  // Merge with override headers
  if (overrides.headers) {
    overrides.headers.forEach((value, key) => {
      headers.set(key, value);
    });
  }
  
  // Parse timeout with validation
  const timeoutMs = overrides.requestTimeoutMs ?? 
    (env.REQUEST_TIMEOUT_MS ? validateTimeout(env.REQUEST_TIMEOUT_MS) : 30000);
  
  return {
    app,
    spec: validateSpecUrl(specUrl),
    port,
    headers,
    transport: overrides.transport ?? env.TRANSPORT ?? 'http',
    requestTimeoutMs: timeoutMs,
    ...(overrides.baseUrl ?? env.BASE_URL ? { baseUrl: overrides.baseUrl ?? env.BASE_URL } : {})
  };
}

/**
 * Create ServerOptions with validation (requires all mandatory fields)
 */
export function createValidatedServerConfig(options: {
  readonly app: AppContext;
  readonly spec: string;
  readonly port?: number;
  readonly headers?: Headers;
  readonly transport?: TransportType;
  readonly baseUrl?: string;
  readonly requestTimeoutMs?: number;
}): ServerOptions {
  return {
    app: options.app,
    spec: validateSpecUrl(options.spec),
    port: validatePort(options.port ?? getDefaultPort()),
    headers: options.headers ?? new Headers(),
    transport: options.transport ?? 'http',
    requestTimeoutMs: options.requestTimeoutMs ?? 30000,
    ...(options.baseUrl ? { baseUrl: options.baseUrl } : {})
  };
}

/**
 * Create configuration from environment only (12-factor app mode)
 * Perfect for Heroku deployment
 */
export function createEnvironmentConfig(
  app: AppContext,
  overrides: ConfigOverrides = {}
): ServerOptions {
  const env = loadEnvironmentConfig();
  
  if (!env.OPENAPI_SPEC_URL && !overrides.spec) {
    throw missingSpecError();
  }
  
  return createServerConfig(app, overrides);
}

/**
 * Validate and parse timeout value
 */
function validateTimeout(timeoutStr: string): number {
  const timeout = Number(timeoutStr);
  if (!Number.isInteger(timeout) || timeout < 0) {
    throw createConfigurationError(
      `Invalid REQUEST_TIMEOUT_MS: "${timeoutStr}". Must be a positive integer (milliseconds).`,
      { provided: timeoutStr }
    );
  }
  if (timeout < 1000) {
    throw createConfigurationError(
      `REQUEST_TIMEOUT_MS too small: ${timeout}ms. Minimum is 1000ms (1 second).`,
      { provided: timeout }
    );
  }
  if (timeout > 300000) {
    throw createConfigurationError(
      `REQUEST_TIMEOUT_MS too large: ${timeout}ms. Maximum is 300000ms (5 minutes).`,
      { provided: timeout }
    );
  }
  return timeout;
}

/**
 * Parse JSON-formatted auth headers from environment
 */
function parseAuthHeaders(authHeadersJson: string, targetHeaders: Headers): void {
  try {
    const parsed = JSON.parse(authHeadersJson);
    if (typeof parsed !== 'object' || parsed === null) {
      throw createConfigurationError('AUTH_HEADERS must be a JSON object');
    }
    
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value !== 'string') {
        throw createConfigurationError(`Header value for "${key}" must be a string`);
      }
      targetHeaders.set(key, value);
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'SyntaxError') {
      throw createConfigurationError(`Invalid JSON in AUTH_HEADERS: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Parse one --header argument of the form key=value
 * Each time it is called it accumulates headers into a Headers instance.
 */
export function collectHeader(input: string, prev: Headers): Headers {
  const [key, ...rest] = input.split('=');
  if (!key || rest.length === 0) {
    throw createConfigurationError(
      `Invalid header format: "${input}". Expected format: "Name=Value"`,
      { headerString: input }
    );
  }
  const result = new Headers(prev);
  result.set(key.trim(), rest.join('=').trim());
  return result;
}