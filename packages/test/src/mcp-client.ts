/**
 * MCP Client for connecting to Quick-MCP servers
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

import type { MCPConnection, MCPTool, MCPResource } from './types.ts';

export class MCPClient {
  #client: Client | null = null;
  #transport: StdioClientTransport | SSEClientTransport | null = null;
  #connection: MCPConnection | null = null;
  #serverUrl?: string;

  constructor(serverUrl?: string) {
    this.#serverUrl = serverUrl;
  }

  /**
   * Connect to Quick-MCP server
   */
  async connect(specUrl: string): Promise<MCPConnection> {
    try {
      if (this.#serverUrl) {
        // Connect to existing server via HTTP/SSE
        await this.#connectToExistingServer();
      } else {
        // Start new Quick-MCP server process
        await this.#startServerProcess(specUrl);
      }

      // Initialize MCP connection
      await this.#initializeMCPConnection();
      
      if (!this.#connection) {
        throw new Error('Failed to establish connection');
      }
      return this.#connection;
    } catch (error) {
      await this.disconnect();
      throw new Error(`Failed to connect to MCP server: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get available tools
   */
  async getTools(): Promise<MCPTool[]> {
    if (!this.#client) {
      throw new Error('Not connected to MCP server');
    }

    const response = await this.#client.listTools();
    return response.tools.map(tool => ({
      name: tool.name,
      description: tool.description ?? '',
      inputSchema: tool.inputSchema,
      ...(tool.annotations && { annotations: tool.annotations }),
    }));
  }

  /**
   * Get available resources
   */
  async getResources(): Promise<MCPResource[]> {
    if (!this.#client) {
      throw new Error('Not connected to MCP server');
    }

    const response = await this.#client.listResources();
    return response.resources.map(resource => ({
      uri: resource.uri,
      name: resource.name,
      ...(resource.description && { description: resource.description }),
      ...(resource.mimeType && { mimeType: resource.mimeType }),
    }));
  }

  /**
   * Call a tool
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.#client) {
      throw new Error('Not connected to MCP server');
    }

    const response = await this.#client.callTool({ name, arguments: args });
    return response.content; // Return full content
  }

  /**
   * Read a resource
   */
  async readResource(uri: string): Promise<unknown> {
    if (!this.#client) {
      throw new Error('Not connected to MCP server');
    }

    const response = await this.#client.readResource({ uri });
    return response.contents;
  }

  /**
   * Disconnect from server
   */
  async disconnect(): Promise<void> {
    try {
      if (this.#client) {
        await this.#client.close();
        this.#client = null;
      }

      if (this.#transport) {
        await this.#transport.close();
        this.#transport = null;
      }

      this.#connection = null;
    } catch (error) {
      // Log but don't throw on cleanup
      console.warn('Warning during MCP client cleanup:', error);
    }
  }

  /**
   * Check if connected
   */
  get isConnected(): boolean {
    return this.#client !== null && this.#connection !== null;
  }

  /**
   * Get connection info
   */
  get connection(): MCPConnection | null {
    return this.#connection;
  }

  /**
   * Connect to existing Quick-MCP server via HTTP/SSE
   */
  async #connectToExistingServer(): Promise<void> {
    if (!this.#serverUrl) {
      throw new Error('Server URL required for existing server connection');
    }

    // Use SSE transport for HTTP connections
    this.#transport = new SSEClientTransport(new URL(this.#serverUrl));
    this.#client = new Client({
      name: 'quick-mcp-test',
      version: '0.1.0',
    }, {
      capabilities: {
        tools: {},
        resources: {},
      },
    });

    await this.#client.connect(this.#transport);
  }

  /**
   * Start new Quick-MCP server process
   */
  async #startServerProcess(specUrl: string): Promise<void> {
    // Create STDIO transport with server parameters
    const cliPath = new URL('../../core/src/cli.ts', import.meta.url).pathname;
    
    this.#transport = new StdioClientTransport({
      command: 'node',
      args: [
        '--experimental-strip-types',
        cliPath,
        '--spec', specUrl,
        '--transport', 'stdio',
      ],
      env: process.env,
      cwd: process.cwd(),
    });

    this.#client = new Client({
      name: 'quick-mcp-test',
      version: '0.1.0',
    }, {
      capabilities: {
        tools: {},
        resources: {},
      },
    });

    // Connect the client to the transport (this will start it)
    await this.#client.connect(this.#transport);
  }

  /**
   * Initialize MCP connection details
   */
  async #initializeMCPConnection(): Promise<void> {
    if (!this.#client) {
      throw new Error('Client not initialized');
    }

    // Get available tools and resources
    const tools = await this.getTools();
    const resources = await this.getResources();

    this.#connection = {
      url: this.#serverUrl ?? 'stdio://localhost',
      tools,
      resources,
      connected: true,
    };
  }
}