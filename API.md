# API Reference

Public API for Quick-MCP Core

> This documents the stable public interface exported by `@quick-mcp/core`.
> Internal implementation details may change without notice.

## Factory Functions

### `createServer(options: ServerOptions): Promise<QuickMcpServer>`

Creates a new Quick-MCP server instance from configuration options.

```typescript
import { createServer } from '@quick-mcp/core';

const server = await createServer({
  spec: 'https://api.example.com/openapi.json',
  transport: 'http',
  port: 3001,
  headers: new Headers([['Authorization', 'Bearer token']]),
});
```

**Parameters:**

- `options: ServerOptions` - Server configuration object

**Returns:** `Promise<QuickMcpServer>` - Configured server instance

**Throws:** `ConfigurationError` if options are invalid

---

### `createServerFromEnvironment(overrides?: Partial<ServerOptions>): Promise<QuickMcpServer>`

Creates server using environment variables with optional overrides.

```typescript
import { createServerFromEnvironment } from '@quick-mcp/core';

// Uses OPENAPI_SPEC_URL, TRANSPORT, PORT from environment
const server = await createServerFromEnvironment();

// Override specific options
const server2 = await createServerFromEnvironment({
  port: 8080, // Override environment PORT
});
```

**Environment Variables:**

- `OPENAPI_SPEC_URL` - OpenAPI specification URL (required)
- `TRANSPORT` - Transport type: 'http' | 'stdio' (default: 'http')
- `PORT` - HTTP server port (default: 3000)
- `AUTH_HEADERS` - JSON string of authentication headers

**Parameters:**

- `overrides?: Partial<ServerOptions>` - Optional configuration overrides

**Returns:** `Promise<QuickMcpServer>` - Configured server instance

## Core Classes

### `QuickMcpServer`

Main server class that orchestrates MCP server functionality.

```typescript
const server = await createServer(options);

// Start the server
await server.connect();

// Access server information
console.log(server.url); // HTTP transport URL
console.log(server.stats); // Operation statistics
```

**Properties:**

- `url: string` - Server URL (HTTP transport only)
- `stats: OperationStatistics` - Usage statistics and metrics

**Methods:**

- `connect(): Promise<void>` - Start the server and begin accepting connections
- `close(): Promise<void>` - Gracefully shut down the server

---

### `OpenApiSpec`

OpenAPI specification loader and parser.

```typescript
import { OpenApiSpec } from '@quick-mcp/core';

const spec = await OpenApiSpec.load('https://api.example.com/openapi.json');

// Access parsed operations
const operations = spec.getAllOperations();
operations.forEach((op) => {
  console.log(`${op.method} ${op.path}`);
});
```

**Static Methods:**

- `load(spec: string, options?: OpenApiSpecOptions): Promise<OpenApiSpec>` -
  Load from URL or file path

**Instance Methods:**

- `getAllOperations(): QuickMcpOperation[]` - Get all operations as MCP
  tools/resources
- `getOperationById(id: string): QuickMcpOperation | undefined` - Find operation
  by ID

## Type Definitions

### `ServerOptions`

Configuration options for creating a server.

```typescript
interface ServerOptions {
  /** OpenAPI specification URL or file path */
  spec: string;

  /** Transport type for MCP communication */
  transport: 'http' | 'stdio';

  /** Port for HTTP transport (ignored for stdio) */
  port?: number;

  /** Headers to forward to OpenAPI requests */
  headers?: Headers;

  /** Optional logging configuration */
  log?: LogLayer;
}
```

---

### `OpenApiSpecOptions`

Options for loading OpenAPI specifications.

```typescript
interface OpenApiSpecOptions {
  /** Custom headers for loading remote specs */
  headers?: Headers;

  /** Request timeout in milliseconds */
  timeout?: number;
}
```

## Operations and Tools

### `QuickMcpOperation`

Represents a single OpenAPI operation converted to MCP format.

```typescript
// Operations are accessed through OpenApiSpec
const operations = spec.getAllOperations();

operations.forEach((operation) => {
  console.log(`Operation: ${operation.operationId}`);

  if (operation.isResource()) {
    // GET operations with path-only parameters
    const resource = operation.asResource();
    console.log(`Resource: ${resource.name}`);
  } else {
    // All other operations
    const tool = operation.asTool();
    console.log(`Tool: ${tool.name}`);
  }
});
```

**Properties:**

- `operationId: string` - Unique operation identifier
- `method: string` - HTTP method (GET, POST, etc.)
- `path: string` - URL path template

**Methods:**

- `isResource(): boolean` - Check if operation is classified as MCP resource
- `asTool(): McpTool` - Convert to MCP tool format
- `asResource(): McpResource` - Convert to MCP resource format

## Error Handling

### Error Hierarchy

```typescript
import {
  ConfigurationError,
  OpenApiError,
  TransportError,
  ServerError,
} from '@quick-mcp/core';

try {
  const server = await createServer(invalidOptions);
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.error('Invalid configuration:', error.message);
  } else if (error instanceof OpenApiError) {
    console.error('OpenAPI spec error:', error.message);
  }
  // ... handle other error types
}
```

**Error Types:**

- `ConfigurationError` - Invalid server options or environment
- `OpenApiError` - OpenAPI specification parsing failures
- `TransportError` - Network or connection errors
- `ServerError` - Runtime server errors

## Examples

### Basic HTTP Server

```typescript
import { createServer } from '@quick-mcp/core';

const server = await createServer({
  spec: 'https://petstore.swagger.io/v2/swagger.json',
  transport: 'http',
  port: 3001,
});

await server.connect();
console.log(`Quick-MCP server running at ${server.url}`);
```

### Stdio Transport (for MCP clients)

```typescript
import { createServer } from '@quick-mcp/core';

const server = await createServer({
  spec: './api-spec.yaml',
  transport: 'stdio',
});

await server.connect();
// Server communicates via stdin/stdout
```

### With Authentication

```typescript
import { createServerFromEnvironment } from '@quick-mcp/core';

// Set environment variables:
// OPENAPI_SPEC_URL=https://api.example.com/openapi.json
// AUTH_HEADERS={"Authorization": "Bearer secret-token"}
// TRANSPORT=http
// PORT=3001

const server = await createServerFromEnvironment();
await server.connect();
```

### Custom Headers

```typescript
import { createServer } from '@quick-mcp/core';

const headers = new Headers([
  ['Authorization', 'Bearer token'],
  ['X-API-Key', 'api-key-value'],
  ['User-Agent', 'Quick-MCP/1.0'],
]);

const server = await createServer({
  spec: 'https://api.example.com/openapi.json',
  transport: 'http',
  headers,
});
```

## Version Compatibility

- **Node.js**: 18+ (uses `--experimental-strip-types`)
- **MCP SDK**: ^1.11.2
- **TypeScript**: 5.8+ (for development)

## Migration Guide

### From Legacy `QuickMCP` Class

```typescript
// OLD (deprecated)
import { QuickMCP } from '@quick-mcp/core';
const server = await QuickMCP.load(options);

// NEW (recommended)
import { createServer } from '@quick-mcp/core';
const server = await createServer(options);
```

The legacy `QuickMCP` class is still available but deprecated. Use factory
functions for new code.
