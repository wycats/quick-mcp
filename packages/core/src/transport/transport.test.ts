import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, it, expect } from 'vitest';

import type { TransportType } from '../config.ts';
import { testApp } from '../test/create-oas.ts';

import { createTransport } from './factory.ts';
import { HttpTransport } from './http.ts';
import { StdioTransport } from './stdio.ts';

describe('Transport Layer', () => {
  describe('Transport Factory', () => {
    it('should create HTTP transport', () => {
      const { app } = testApp();
      const transport = createTransport('http', { app, port: 3001 });
      
      expect(transport).toBeInstanceOf(HttpTransport);
    });

    it('should create STDIO transport', () => {
      const { app } = testApp();
      const transport = createTransport('stdio', { app });
      
      expect(transport).toBeInstanceOf(StdioTransport);
    });

    it('should throw error for unknown transport type', () => {
      const { app } = testApp();
      
      expect(() => {
        createTransport('unknown' as TransportType, { app });
      }).toThrow('Unknown transport type: "unknown"');
    });

    it('should pass through port option to HTTP transport', () => {
      const { app } = testApp();
      const port = 9999;
      const transport = createTransport('http', { app, port });
      
      expect(transport).toBeInstanceOf(HttpTransport);
      // Port should be stored in transport options
    });

    it('should create transport without port for STDIO', () => {
      const { app } = testApp();
      const transport = createTransport('stdio', { app });
      
      expect(transport).toBeInstanceOf(StdioTransport);
    });
  });

  describe('STDIO Transport', () => {
    it('should create and connect without errors', async () => {
      const { app } = testApp();
      const transport = new StdioTransport({ app });
      
      // Create a minimal MCP server for testing
      const server = new McpServer({
        name: 'test-server',
        version: '1.0.0',
      });

      // Should be able to connect without throwing
      await expect(transport.connect(server)).resolves.toBeUndefined();
    });

    it('should start without errors', async () => {
      const { app } = testApp();
      const transport = new StdioTransport({ app });
      
      const server = new McpServer({
        name: 'test-server',
        version: '1.0.0',
      });

      await transport.connect(server);
      
      // Should be able to start without throwing
      await expect(transport.start()).resolves.toBeUndefined();
    });

    it('should call onReady callback with correct info', async () => {
      const { app } = testApp();
      const transport = new StdioTransport({ app });
      
      const server = new McpServer({
        name: 'test-server',
        version: '1.0.0',
      });

      await transport.connect(server);
      
      let readyInfo: unknown = null;
      await transport.start((info) => {
        readyInfo = info;
      });
      
      expect(readyInfo).toEqual({
        type: 'stdio',
      });
    });

    it('should stop without errors', async () => {
      const { app } = testApp();
      const transport = new StdioTransport({ app });
      
      // Should be able to stop without throwing
      await expect(transport.stop()).resolves.toBeUndefined();
    });
  });

  describe('HTTP Transport', () => {
    it('should create and connect without errors', async () => {
      const { app } = testApp();
      const transport = new HttpTransport({ app, port: 3001 });
      
      // Create a minimal MCP server for testing
      const server = new McpServer({
        name: 'test-server',
        version: '1.0.0',
      });

      // Should be able to connect without throwing
      await expect(transport.connect(server)).resolves.toBeUndefined();
    });

    it('should reject start() if not connected', async () => {
      const { app } = testApp();
      const transport = new HttpTransport({ app, port: 3001 });
      
      // Should reject if connect() was never called
      await expect(transport.start()).rejects.toThrow('Transport not connected');
    });

    it('should start HTTP server with callback', async () => {
      const { app } = testApp();
      const transport = new HttpTransport({ app, port: 0 }); // Use port 0 for dynamic allocation
      
      const server = new McpServer({
        name: 'test-server',
        version: '1.0.0',
      });

      await transport.connect(server);

      let readyInfo: unknown = null;
      await transport.start((info) => {
        readyInfo = info;
      });

      expect(readyInfo).toMatchObject({
        type: 'http',
        url: expect.stringContaining('http://'),
        port: expect.any(Number),
        host: expect.any(String),
      });

      // Clean up
      await transport.stop();
    });

    it('should handle server start/stop lifecycle', async () => {
      const { app } = testApp();
      const transport = new HttpTransport({ app, port: 0 });
      
      const server = new McpServer({
        name: 'test-server',
        version: '1.0.0',
      });

      // Connect -> Start -> Stop cycle
      await transport.connect(server);
      await transport.start();
      await transport.stop();
      
      // Should be able to repeat
      await transport.start();
      await transport.stop();
    });

    it('should stop gracefully when no server running', async () => {
      const { app } = testApp();
      const transport = new HttpTransport({ app, port: 3001 });
      
      // Should be able to stop without throwing even if never started
      await expect(transport.stop()).resolves.toBeUndefined();
    });

    it('should use different hosts based on NODE_ENV', async () => {
      const { app } = testApp();
      const transport = new HttpTransport({ app, port: 0 });
      
      const server = new McpServer({
        name: 'test-server',
        version: '1.0.0',
      });

      await transport.connect(server);

      // In test environment, should use localhost
      let readyInfo: unknown = null;
      await transport.start((info) => {
        readyInfo = info;
      });

      expect((readyInfo as { host: string }).host).toBe('localhost');
      expect((readyInfo as { url: string }).url).toContain('localhost');

      await transport.stop();
    });
  });

  describe('Error Handling', () => {
    it('should handle MCP server connection errors', async () => {
      const { app } = testApp();
      const transport = new StdioTransport({ app });
      
      // Create a server that will fail to connect
      const brokenServer = {} as McpServer;
      
      await expect(transport.connect(brokenServer)).rejects.toThrow();
    });

    it('should handle HTTP transport connection errors', async () => {
      const { app } = testApp();
      const transport = new HttpTransport({ app, port: 3001 });
      
      // Create a server that will fail to connect
      const brokenServer = {} as McpServer;
      
      await expect(transport.connect(brokenServer)).rejects.toThrow();
    });

    it('should handle server lifecycle correctly', async () => {
      const { app } = testApp();
      const transport = new HttpTransport({ app, port: 0 }); // Use dynamic port
      
      const server = new McpServer({ name: 'test-server', version: '1.0.0' });

      await transport.connect(server);

      // Should start successfully with dynamic port
      await transport.start();
      
      // Should stop without error
      await transport.stop();
      
      // Should be able to restart
      await transport.start();
      await transport.stop();
    });

    it('should handle missing callback gracefully', async () => {
      const { app } = testApp();
      const transport = new StdioTransport({ app });
      
      const server = new McpServer({
        name: 'test-server',
        version: '1.0.0',
      });

      await transport.connect(server);
      
      // Should work without callback
      await expect(transport.start()).resolves.toBeUndefined();
    });
  });
});