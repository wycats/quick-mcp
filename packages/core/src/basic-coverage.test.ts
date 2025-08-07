/**
 * Basic tests to improve test coverage
 */

import { describe, it, expect } from 'vitest';

describe('Basic Coverage Tests', () => {
  describe('Error module', () => {
    it('should import error functions', async () => {
      const { createConfigurationError, missingSpecError, requestTimeoutError } = await import('./errors/index.ts');
      
      const configError = createConfigurationError('Test error');
      expect(configError.message).toBe('Test error');
      expect(configError.code).toBe('CONFIGURATION_ERROR');
      
      const specError = missingSpecError();
      expect(specError.message).toContain('OpenAPI spec URL');
      
      const timeoutError = requestTimeoutError('https://example.com', 'GET');
      expect(timeoutError.message).toContain('timeout');
    });
  });

  describe('CLI module', () => {
    it('should create CLI program', async () => {
      const { createCLI } = await import('./cli.ts');
      
      const program = createCLI();
      expect(program.name()).toBe('quick-mcp');
      expect(typeof program.parse).toBe('function');
    });
  });

  describe('Client module', () => {
    it('should export OperationClient', async () => {
      const { OperationClient } = await import('./client.ts');
      
      expect(typeof OperationClient).toBe('function');
      expect(typeof OperationClient.tool).toBe('function');
      expect(typeof OperationClient.resource).toBe('function');
    });
  });

  describe('Config module', () => {
    it('should export config functions', async () => {
      const { loadEnvironmentConfig, createServerConfig, collectHeader } = await import('./config.ts');
      
      expect(typeof loadEnvironmentConfig).toBe('function');
      expect(typeof createServerConfig).toBe('function');
      expect(typeof collectHeader).toBe('function');
      
      const envConfig = loadEnvironmentConfig();
      expect(typeof envConfig).toBe('object');
    });
  });

  describe('Type validation', () => {
    it('should validate ports and URLs', async () => {
      const { validatePort, validateSpecUrl } = await import('./types.ts');
      
      const port = validatePort('3000');
      expect(port.valueOf()).toBe(3000);
      
      const url = validateSpecUrl('https://api.example.com/spec.json');
      expect(url.toString()).toBe('https://api.example.com/spec.json');
    });
  });

  describe('Logging', () => {
    it('should create app context', async () => {
      const { createAppContext } = await import('./logging.ts');
      
      const context = createAppContext('info');
      expect(typeof context.log).toBe('object');
      expect(typeof context.log.info).toBe('function');
    });
  });

  describe('Server', () => {
    it('should export server creation functions', async () => {
      const { createServer, createServerFromEnvironment } = await import('./app.ts');
      
      expect(typeof createServer).toBe('function');
      expect(typeof createServerFromEnvironment).toBe('function');
    });
  });

  describe('OpenAPI', () => {
    it('should export OpenAPI parsing functions', async () => {
      const openapi = await import('./openapi.ts');
      
      // Check that the module exports something
      expect(typeof openapi).toBe('object');
      expect(Object.keys(openapi).length).toBeGreaterThan(0);
    });
  });

  describe('Transport', () => {
    it('should export transport factory', async () => {
      const { createTransport } = await import('./transport/factory.ts');
      
      expect(typeof createTransport).toBe('function');
    });
  });
});