/**
 * End-to-End Integration Tests
 * Tests the complete OpenAPI → MCP conversion and server startup flow
 */

import type { Server } from 'http';

import express from 'express';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { createServer } from './app.ts';
import { createAppContext } from './logging.ts';
import { validateSpecUrl, validatePort } from './types.ts';

// Test API server with real Express implementation
function createTestApiServer(port: number): Promise<Server> {
  return new Promise((resolve) => {
    const app = express();
    app.use(express.json());

    // Test OpenAPI spec endpoint
    app.get('/api-docs.json', (_req, res) => {
      res.json({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              operationId: 'getUsers',
              summary: 'Get all users',
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: { type: 'object' }
                      }
                    }
                  }
                }
              }
            },
            post: {
              operationId: 'createUser',
              summary: 'Create user',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        email: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: {
                '201': { description: 'Created' }
              }
            }
          },
          '/users/{id}': {
            get: {
              operationId: 'getUser',
              summary: 'Get user by ID',
              parameters: [{
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' }
              }],
              responses: {
                '200': { description: 'Success' }
              }
            }
          }
        }
      });
    });

    // Test API endpoints
    app.get('/users', (_req, res) => {
      res.json([
        { id: 1, name: 'Test User', email: 'test@example.com' }
      ]);
    });

    app.post('/users', (req, res) => {
      res.status(201).json({
        id: Date.now(),
        ...req.body
      });
    });

    app.get('/users/:id', (req, res) => {
      res.json({
        id: req.params.id,
        name: 'Test User',
        email: 'test@example.com'
      });
    });

    const server = app.listen(port, () => {
      resolve(server);
    });
  });
}

describe('End-to-End OpenAPI → MCP Flow', () => {
  const TEST_API_PORT = 3998;
  const TEST_PORT = 3999;
  let _testApiServer: Server;
  let quickMcpServer: { start(): Promise<void>; spec: { getTools(): { name: string; description: string }[]; getResources(): { name: string; description: string }[] } };
  
  // Create simple app context to avoid logger conflicts
  function createTestAppContext() {
    const testId = Math.random().toString(36).substring(7);
    process.env['LOG_FILE'] = `./logs/test-${testId}.log`;
    return createAppContext('error'); // Silent logging for tests
  }

  beforeAll(async () => {
    // Start test API server
    _testApiServer = await createTestApiServer(TEST_API_PORT);
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    // Clean up servers
    await new Promise<void>((_resolve) => {
      _testApiServer.close(() => {
        _resolve();
      });
    });
  });

  it('should convert OpenAPI spec to MCP tools and resources', async () => {
    const app = createTestAppContext();
    
    // Create Quick-MCP server pointing to test API
    quickMcpServer = await createServer({
      app,
      spec: validateSpecUrl(`http://localhost:${TEST_API_PORT}/api-docs.json`),
      port: validatePort(TEST_PORT),
      transport: 'http',
      headers: new Headers(),
      baseUrl: `http://localhost:${TEST_API_PORT}`,
    });

    // Start the server
    await quickMcpServer.start();

    // Verify tools and resources were created from OpenAPI spec
    const spec = quickMcpServer.spec;
    expect(spec).toBeDefined();
    
    const tools = spec.getTools();
    const resources = spec.getResources();
    
    expect(tools.length).toBeGreaterThan(0);
    expect(resources.length).toBeGreaterThan(0);

    // Verify specific tools we expect from test API
    const toolNames = tools.map((t: { name: string }) => t.name);
    expect(toolNames).toContain('createUser'); // Should have POST /users
    expect(toolNames).toContain('getUser'); // Should have GET /users/{id}
    
    // Verify resources were created for GET operations
    const resourceNames = resources.map((r: { name: string }) => r.name);
    expect(resourceNames).toContain('getUsers'); // Should have GET /users as resource
    
    // Verify tool has expected properties
    const createUserTool = tools.find((t: { name: string }) => t.name === 'createUser');
    expect(createUserTool).toBeDefined();
    expect(createUserTool).toMatchObject({
      name: 'createUser',
      description: expect.any(String)
    });
  }, 15000);

  // Additional integration tests would go here
  // Skipping due to logger conflicts in test environment
});