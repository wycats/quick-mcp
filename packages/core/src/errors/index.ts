/**
 * Domain-specific error types for Quick-MCP
 * 
 * Provides structured error handling with context through simple functions
 * rather than complex inheritance chains.
 */

export interface ErrorInfo {
  readonly code: string;
  readonly context?: Record<string, unknown> | undefined;
}

/**
 * Base error class - simple and minimal
 */
export class QuickMcpError extends Error {
  readonly code: string;
  readonly context?: Record<string, unknown>;

  constructor(message: string, info: ErrorInfo) {
    super(message);
    this.name = 'QuickMcpError';
    this.code = info.code;
    if (info.context !== undefined) {
      this.context = info.context;
    }

    // Maintains proper stack trace (V8 only)
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, QuickMcpError);
    }
  }
}

// ============================================================================
// Configuration Errors
// ============================================================================

export function createConfigurationError(
  message: string, 
  context?: Record<string, unknown>
): QuickMcpError {
  return new QuickMcpError(message, { 
    code: 'CONFIGURATION_ERROR', 
    context 
  });
}

export function missingSpecError(): QuickMcpError {
  return createConfigurationError(
    'OpenAPI spec URL must be provided via OPENAPI_SPEC_URL environment variable or configuration'
  );
}

export function missingAppError(): QuickMcpError {
  return createConfigurationError(
    'Application context must be provided via configuration'
  );
}

export function invalidAuthHeadersError(cause: unknown): QuickMcpError {
  return createConfigurationError(
    'Failed to parse AUTH_HEADERS environment variable - must be valid JSON',
    { cause }
  );
}

export function invalidEnvironmentValueError(
  key: string, 
  value: string, 
  validValues: string[]
): QuickMcpError {
  return createConfigurationError(
    `Invalid value for ${key}: "${value}". Valid values are: ${validValues.join(', ')}`,
    { key, value, validValues }
  );
}

// ============================================================================
// Transport Errors  
// ============================================================================

export function createTransportError(
  message: string,
  context?: Record<string, unknown>
): QuickMcpError {
  return new QuickMcpError(message, { 
    code: 'TRANSPORT_ERROR', 
    context 
  });
}

export function transportNotConnectedError(): QuickMcpError {
  return createTransportError(
    'Transport not connected. Call connect() before start()'
  );
}

export function httpServerFailedError(port: number, cause: unknown): QuickMcpError {
  return createTransportError(
    `Failed to start HTTP server on port ${port}`,
    { port, cause }
  );
}

export function httpServerError(cause: unknown): QuickMcpError {
  return createTransportError(
    'HTTP server encountered an error',
    { cause }
  );
}

// ============================================================================
// OpenAPI Errors
// ============================================================================

export function createOpenApiError(
  message: string,
  context?: Record<string, unknown>
): QuickMcpError {
  return new QuickMcpError(message, { 
    code: 'OPENAPI_ERROR', 
    context 
  });
}

export function openApiValidationFailedError(validationErrors: string): QuickMcpError {
  return createOpenApiError(
    `OpenAPI specification validation failed: ${validationErrors}`,
    { validationErrors }
  );
}

export function openApiParseFailedError(specPath: string, cause: unknown): QuickMcpError {
  return createOpenApiError(
    `Failed to parse OpenAPI specification from: ${specPath}`,
    { specPath, cause }
  );
}

export function invalidValidationResultError(validation: unknown): QuickMcpError {
  return createOpenApiError(
    `Invalid validation result from OpenAPI parser: ${String(validation)}`,
    { validation }
  );
}

// ============================================================================
// Server Errors
// ============================================================================

export function createServerError(
  message: string,
  context?: Record<string, unknown>
): QuickMcpError {
  return new QuickMcpError(message, { 
    code: 'SERVER_ERROR', 
    context 
  });
}

export function serverStartupFailedError(cause: unknown): QuickMcpError {
  return createServerError(
    'Failed to start MCP server',
    { cause }
  );
}

export function serverInitializationFailedError(component: string, cause: unknown): QuickMcpError {
  return createServerError(
    `Failed to initialize server component: ${component}`,
    { component, cause }
  );
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Type guard to check if an error is a Quick-MCP error
 */
export function isQuickMcpError(error: unknown): error is QuickMcpError {
  return error instanceof QuickMcpError;
}

/**
 * Utility to safely extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Utility to safely extract error stack from unknown error
 */
export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
}