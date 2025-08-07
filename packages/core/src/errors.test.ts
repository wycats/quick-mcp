import { describe, it, expect } from 'vitest';

import {
  QuickMcpError,
  createConfigurationError,
  missingSpecError,
  missingAppError,
  invalidAuthHeadersError,
  invalidEnvironmentValueError,
  createTransportError,
  transportNotConnectedError,
  httpServerFailedError,
  httpServerError,
  createOpenApiError,
  openApiValidationFailedError,
  openApiParseFailedError,
  invalidValidationResultError,
  createNetworkError,
  requestTimeoutError,
  networkRequestError,
  createServerError,
  serverStartupFailedError,
  serverInitializationFailedError,
  isQuickMcpError,
  getErrorMessage,
  getErrorStack,
} from './errors/index.ts';

describe('QuickMcpError', () => {
  it('should create error with message and code', () => {
    const error = new QuickMcpError('Test message', { code: 'TEST_CODE' });
    
    expect(error.message).toBe('Test message');
    expect(error.code).toBe('TEST_CODE');
    expect(error.name).toBe('QuickMcpError');
    expect(error.context).toBeUndefined();
  });

  it('should create error with context', () => {
    const context = { key: 'value', number: 123 };
    const error = new QuickMcpError('Test message', { code: 'TEST_CODE', context });
    
    expect(error.message).toBe('Test message');
    expect(error.code).toBe('TEST_CODE');
    expect(error.context).toEqual(context);
  });

  it('should be instanceof Error and QuickMcpError', () => {
    const error = new QuickMcpError('Test message', { code: 'TEST_CODE' });
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(QuickMcpError);
  });

  it('should have proper stack trace', () => {
    const error = new QuickMcpError('Test message', { code: 'TEST_CODE' });
    
    expect(error.stack).toBeDefined();
    expect(typeof error.stack).toBe('string');
  });
});

describe('Configuration Errors', () => {
  describe('createConfigurationError', () => {
    it('should create configuration error with message', () => {
      const error = createConfigurationError('Configuration failed');
      
      expect(error).toBeInstanceOf(QuickMcpError);
      expect(error.message).toBe('Configuration failed');
      expect(error.code).toBe('CONFIGURATION_ERROR');
      expect(error.context).toBeUndefined();
    });

    it('should create configuration error with context', () => {
      const context = { field: 'port', value: 'invalid' };
      const error = createConfigurationError('Invalid port value', context);
      
      expect(error.message).toBe('Invalid port value');
      expect(error.code).toBe('CONFIGURATION_ERROR');
      expect(error.context).toEqual(context);
    });
  });

  describe('missingSpecError', () => {
    it('should create error for missing spec URL', () => {
      const error = missingSpecError();
      
      expect(error).toBeInstanceOf(QuickMcpError);
      expect(error.message).toContain('OpenAPI spec URL must be provided');
      expect(error.code).toBe('CONFIGURATION_ERROR');
    });
  });

  describe('missingAppError', () => {
    it('should create error for missing app context', () => {
      const error = missingAppError();
      
      expect(error).toBeInstanceOf(QuickMcpError);
      expect(error.message).toContain('Application context must be provided');
      expect(error.code).toBe('CONFIGURATION_ERROR');
    });
  });

  describe('invalidAuthHeadersError', () => {
    it('should create error for invalid auth headers', () => {
      const cause = new Error('JSON parse error');
      const error = invalidAuthHeadersError(cause);
      
      expect(error).toBeInstanceOf(QuickMcpError);
      expect(error.message).toContain('Failed to parse AUTH_HEADERS');
      expect(error.code).toBe('CONFIGURATION_ERROR');
      expect(error.context?.cause).toBe(cause);
    });
  });

  describe('invalidEnvironmentValueError', () => {
    it('should create error for invalid environment value', () => {
      const error = invalidEnvironmentValueError('LOG_LEVEL', 'invalid', ['info', 'warn', 'error']);
      
      expect(error).toBeInstanceOf(QuickMcpError);
      expect(error.message).toContain('Invalid value for LOG_LEVEL');
      expect(error.message).toContain('"invalid"');
      expect(error.message).toContain('info, warn, error');
      expect(error.code).toBe('CONFIGURATION_ERROR');
      expect(error.context).toEqual({
        key: 'LOG_LEVEL',
        value: 'invalid',
        validValues: ['info', 'warn', 'error']
      });
    });
  });
});

describe('Transport Errors', () => {
  describe('createTransportError', () => {
    it('should create transport error with message', () => {
      const error = createTransportError('Transport failed');
      
      expect(error).toBeInstanceOf(QuickMcpError);
      expect(error.message).toBe('Transport failed');
      expect(error.code).toBe('TRANSPORT_ERROR');
    });

    it('should create transport error with context', () => {
      const context = { transport: 'http', port: 8080 };
      const error = createTransportError('HTTP transport failed', context);
      
      expect(error.context).toEqual(context);
    });
  });

  describe('transportNotConnectedError', () => {
    it('should create error for not connected transport', () => {
      const error = transportNotConnectedError();
      
      expect(error.message).toContain('Transport not connected');
      expect(error.message).toContain('Call connect() before start()');
      expect(error.code).toBe('TRANSPORT_ERROR');
    });
  });

  describe('httpServerFailedError', () => {
    it('should create error for HTTP server startup failure', () => {
      const cause = new Error('Port in use');
      const error = httpServerFailedError(8080, cause);
      
      expect(error.message).toContain('Failed to start HTTP server on port 8080');
      expect(error.code).toBe('TRANSPORT_ERROR');
      expect(error.context?.port).toBe(8080);
      expect(error.context?.cause).toBe(cause);
    });
  });

  describe('httpServerError', () => {
    it('should create error for general HTTP server error', () => {
      const cause = new Error('Server error');
      const error = httpServerError(cause);
      
      expect(error.message).toContain('HTTP server encountered an error');
      expect(error.code).toBe('TRANSPORT_ERROR');
      expect(error.context?.cause).toBe(cause);
    });
  });
});

describe('OpenAPI Errors', () => {
  describe('createOpenApiError', () => {
    it('should create OpenAPI error with message', () => {
      const error = createOpenApiError('OpenAPI failed');
      
      expect(error).toBeInstanceOf(QuickMcpError);
      expect(error.message).toBe('OpenAPI failed');
      expect(error.code).toBe('OPENAPI_ERROR');
    });
  });

  describe('openApiValidationFailedError', () => {
    it('should create error for validation failure', () => {
      const validationErrors = 'Missing required field: paths';
      const error = openApiValidationFailedError(validationErrors);
      
      expect(error.message).toContain('OpenAPI specification validation failed');
      expect(error.message).toContain(validationErrors);
      expect(error.code).toBe('OPENAPI_ERROR');
      expect(error.context?.validationErrors).toBe(validationErrors);
    });
  });

  describe('openApiParseFailedError', () => {
    it('should create error for parse failure', () => {
      const specPath = 'https://api.example.com/spec.json';
      const cause = new Error('Network error');
      const error = openApiParseFailedError(specPath, cause);
      
      expect(error.message).toContain('Failed to parse OpenAPI specification');
      expect(error.message).toContain(specPath);
      expect(error.code).toBe('OPENAPI_ERROR');
      expect(error.context?.specPath).toBe(specPath);
      expect(error.context?.cause).toBe(cause);
    });
  });

  describe('invalidValidationResultError', () => {
    it('should create error for invalid validation result', () => {
      const validation = { invalid: 'result' };
      const error = invalidValidationResultError(validation);
      
      expect(error.message).toContain('Invalid validation result');
      expect(error.code).toBe('OPENAPI_ERROR');
      expect(error.context?.validation).toBe(validation);
    });
  });
});

describe('Network Errors', () => {
  describe('createNetworkError', () => {
    it('should create network error with message', () => {
      const error = createNetworkError('Network failed');
      
      expect(error).toBeInstanceOf(QuickMcpError);
      expect(error.message).toBe('Network failed');
      expect(error.code).toBe('NETWORK_ERROR');
    });
  });

  describe('requestTimeoutError', () => {
    it('should create error for request timeout', () => {
      const operation = { id: 'getUser', method: 'GET', path: '/users/{id}' };
      const timeoutMs = 30000;
      const error = requestTimeoutError(operation, timeoutMs);
      
      expect(error.message).toContain('Request timeout after 30000ms');
      expect(error.message).toContain('GET /users/{id}');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.context).toEqual({
        operationId: 'getUser',
        method: 'GET',
        path: '/users/{id}',
        timeoutMs: 30000
      });
    });
  });

  describe('networkRequestError', () => {
    it('should create error for network request failure', () => {
      const operation = { id: 'postUser', method: 'POST', path: '/users' };
      const cause = new Error('Connection refused');
      const error = networkRequestError(operation, cause);
      
      expect(error.message).toContain('Network request failed');
      expect(error.message).toContain('POST /users');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.context).toEqual({
        operationId: 'postUser',
        method: 'POST',
        path: '/users',
        cause
      });
    });
  });
});

describe('Server Errors', () => {
  describe('createServerError', () => {
    it('should create server error with message', () => {
      const error = createServerError('Server failed');
      
      expect(error).toBeInstanceOf(QuickMcpError);
      expect(error.message).toBe('Server failed');
      expect(error.code).toBe('SERVER_ERROR');
    });
  });

  describe('serverStartupFailedError', () => {
    it('should create error for server startup failure', () => {
      const cause = new Error('Initialization failed');
      const error = serverStartupFailedError(cause);
      
      expect(error.message).toContain('Failed to start MCP server');
      expect(error.code).toBe('SERVER_ERROR');
      expect(error.context?.cause).toBe(cause);
    });
  });

  describe('serverInitializationFailedError', () => {
    it('should create error for component initialization failure', () => {
      const component = 'transport';
      const cause = new Error('Transport init failed');
      const error = serverInitializationFailedError(component, cause);
      
      expect(error.message).toContain('Failed to initialize server component: transport');
      expect(error.code).toBe('SERVER_ERROR');
      expect(error.context?.component).toBe(component);
      expect(error.context?.cause).toBe(cause);
    });
  });
});

describe('Utility Functions', () => {
  describe('isQuickMcpError', () => {
    it('should return true for QuickMcpError instances', () => {
      const error = new QuickMcpError('Test', { code: 'TEST' });
      
      expect(isQuickMcpError(error)).toBe(true);
    });

    it('should return false for regular Error instances', () => {
      const error = new Error('Regular error');
      
      expect(isQuickMcpError(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isQuickMcpError('string')).toBe(false);
      expect(isQuickMcpError(123)).toBe(false);
      expect(isQuickMcpError(null)).toBe(false);
      expect(isQuickMcpError(undefined)).toBe(false);
      expect(isQuickMcpError({})).toBe(false);
    });

    it('should return true for configuration error instances', () => {
      const error = createConfigurationError('Config error');
      
      expect(isQuickMcpError(error)).toBe(true);
    });
  });

  describe('getErrorMessage', () => {
    it('should return message from Error instances', () => {
      const error = new Error('Error message');
      
      expect(getErrorMessage(error)).toBe('Error message');
    });

    it('should return message from QuickMcpError instances', () => {
      const error = new QuickMcpError('Quick MCP error', { code: 'TEST' });
      
      expect(getErrorMessage(error)).toBe('Quick MCP error');
    });

    it('should convert non-error values to string', () => {
      expect(getErrorMessage('string error')).toBe('string error');
      expect(getErrorMessage(123)).toBe('123');
      expect(getErrorMessage(null)).toBe('null');
      expect(getErrorMessage(undefined)).toBe('undefined');
    });

    it('should handle objects', () => {
      const obj = { key: 'value' };
      
      expect(getErrorMessage(obj)).toBe('[object Object]');
    });
  });

  describe('getErrorStack', () => {
    it('should return stack from Error instances', () => {
      const error = new Error('Error message');
      
      const stack = getErrorStack(error);
      expect(typeof stack).toBe('string');
      expect(stack).toContain('Error: Error message');
    });

    it('should return stack from QuickMcpError instances', () => {
      const error = new QuickMcpError('Quick MCP error', { code: 'TEST' });
      
      const stack = getErrorStack(error);
      expect(typeof stack).toBe('string');
      expect(stack).toContain('QuickMcpError: Quick MCP error');
    });

    it('should return undefined for non-error values', () => {
      expect(getErrorStack('string')).toBeUndefined();
      expect(getErrorStack(123)).toBeUndefined();
      expect(getErrorStack(null)).toBeUndefined();
      expect(getErrorStack(undefined)).toBeUndefined();
      expect(getErrorStack({})).toBeUndefined();
    });
  });
});