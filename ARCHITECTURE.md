# Quick-MCP Architecture

This document describes the system design, core patterns, and architectural
decisions for Quick-MCP.

## System Overview

Quick-MCP is a dynamic proxy server that converts OpenAPI specifications into
Model Context Protocol (MCP) tools and resources in real-time. Unlike static
code generators, Quick-MCP maintains a live connection to OpenAPI specifications
and dynamically translates between MCP and REST protocols.

```text
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Assistant  │◄──►│   Quick-MCP     │◄──►│   Target API    │
│   (Claude, etc) │    │  Proxy Server   │    │  (OpenAPI)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
     MCP Protocol         Dynamic Conversion      HTTP Requests
        │                                              │
        │                ┌─────────────────┐         │
        └────────────────┤ Operation Cache ├─────────┘
                         └─────────────────┘
```

### Key Architectural Principles

1. **Dynamic Proxy Pattern**: No code generation - operations are converted at
   runtime
2. **Operation-Centric Design**: Each OpenAPI operation becomes an MCP tool or
   resource
3. **Transport Agnostic**: Supports both HTTP and STDIO MCP transports
4. **Developer First**: Built for simplicity with production-grade reliability

## Core Components

### 1. OpenAPI Processing (`openapi.ts`)

The central component that loads and processes OpenAPI specifications:

```typescript
class OpenApiSpec {
  static async load(url: SpecUrl): Promise<OpenApiSpec>;

  createTools(server: McpServer): void; // POST, PUT, DELETE operations
  createResources(server: McpServer): void; // GET operations (safe reads)
}
```

**Responsibilities:**

- Load and validate OpenAPI specifications
- Convert operations to MCP tool/resource definitions
- Handle custom `x-quick-mcp` extensions
- Register tools/resources with MCP server

### 2. Operation Abstraction (`operation/ext.ts`)

Wraps OpenAPI operations with MCP-specific logic:

```typescript
class QuickMcpOperation {
  static from(
    operation: Operation,
    extensions: CustomExtensions,
  ): QuickMcpOperation;

  get isResource(): boolean; // GET with path-only params
  get safety(): SafetyLevel; // readonly, update, delete

  bucketArgs(args: JsonObject): BucketedArgs;
  describe(): string;
}
```

**Design Decisions:**

- **Resource Classification**: GET operations with only path parameters are
  resources (safe reads)
- **Safety Levels**: Automatic classification based on HTTP verbs
- **Parameter Bucketing**: Organizes arguments by location (path, query, header,
  body)

### 3. Request Building (`request/request-builder.ts`)

Converts MCP tool arguments to HTTP requests:

```typescript
export function buildRequest(
  app: { log: LogLayer },
  op: QuickMcpOperation,
  args: OasRequestArgs,
): Request;

export function buildRequestParts(
  app: { log: LogLayer },
  op: QuickMcpOperation,
  args: OasRequestArgs,
): { url: URL; init: RequestInit };
```

**Pipeline:**

1. **Argument Bucketing**: Sort args by type (path, query, header, body)
2. **URL Building**: Expand path templates, add query parameters
3. **Body Processing**: Handle JSON, form data, or text content
4. **Header Management**: Set content-type, accept, auth headers

### 4. Response Handling (`response/response-handler.ts`)

Transforms HTTP responses back to MCP format:

```typescript
export async function handleToolResponse(
  response: Response,
  log: LogLayer,
  operation: QuickMcpOperation,
): Promise<CallToolResult>;

export async function handleResourceResponse(
  response: Response,
  log: LogLayer,
  operation: QuickMcpOperation,
): Promise<ReadResourceResult>;
```

**Processing:**

- Parse response body based on content-type
- Handle error status codes with context
- Format for MCP tool result or resource content
- Preserve HTTP metadata when relevant

### 5. Client Orchestration (`client.ts`)

Manages the complete request/response cycle:

```typescript
class OperationClient {
  static tool(app, operation): OperationClient<CallToolResult>;
  static resource(app, operation): OperationClient<ReadResourceResult>;

  async invoke(args): Promise<T>;
}

function createClient(operation, extensions, options): OperationClient;
```

**Responsibilities:**

- Create appropriate client type (tool vs resource)
- Execute HTTP requests via `executeRequest()`
- Apply response transformation
- Handle errors with proper context

## Data Flow

### Tool Call Flow

```text
1. MCP Client calls tool
   └── Arguments: { userId: "123", name: "John" }

2. QuickMcpOperation.bucketArgs()
   └── { path: {userId: "123"}, body: {name: "John"} }

3. buildRequest()
   ├── URL: POST /users/123
   ├── Headers: Content-Type: application/json
   └── Body: {"name": "John"}

4. HTTP Request to API
   └── fetch(request)

5. handleToolResponse()
   └── MCP CallToolResult with formatted response
```

### Resource Read Flow

```text
1. MCP Client reads resource
   └── URI: quick-mcp://users/123

2. Operation lookup by URI
   └── GET /users/{id} operation

3. buildRequest() with path params only
   └── URL: GET /users/123

4. HTTP Request to API
   └── fetch(request)

5. handleResourceResponse()
   └── MCP resource content with metadata
```

## Design Patterns

### 1. Factory Pattern

Used throughout for object construction with validation:

```typescript
// Configuration
const config = createServerConfig(app, overrides);

// Type validation
const port = validatePort(process.env.PORT);
const url = validateSpecUrl(process.env.SPEC_URL);

// Operation clients
const client = OperationClient.tool(app, operation);
```

### 2. Functional Core, Imperative Shell

- **Core Logic**: Pure functions for request/response transformation
- **Shell**: I/O operations (HTTP, file system, logging) at boundaries

```typescript
// Pure function (core)
function buildRequestUrl(operation: Operation, args: BucketedArgs): URL;

// I/O operation (shell)
async function executeRequest(operation, app, args): Promise<Response>;
```

### 3. Strategy Pattern

Different handling strategies based on operation type:

```typescript
// Tool vs Resource strategy
if (operation.isResource) {
  return OperationClient.resource(app, operation);
} else {
  return OperationClient.tool(app, operation);
}

// Content-type strategy
switch (contentType) {
  case 'application/json':
    return JSON.stringify(body);
  case 'application/x-www-form-urlencoded':
    return new URLSearchParams(body).toString();
  default:
    return String(body);
}
```

## Extension System

### Custom Extensions (`x-quick-mcp`)

Support for OpenAPI extension properties:

```yaml
paths:
  /users:
    get:
      x-quick-mcp:
        operationId: 'list_all_users' # Override operation ID
        ignore: false # Skip this operation
        annotations:
          readOnlyHint: true # Additional metadata
```

**Implementation:**

```typescript
class CustomExtensions {
  static of(extensions: unknown): CustomExtensions;

  getOperationId(): string | undefined;
  shouldIgnore(): boolean;
  getAnnotations(): Record<string, unknown>;
}
```

## Type Safety

### Branded Types

Using type-fest Tagged types for domain safety:

```typescript
import type { Tagged } from 'type-fest';

export type Port = Tagged<number, 'Port'>;
export type SpecUrl = Tagged<string, 'SpecUrl'>;

// Runtime validation with compile-time safety
export function validatePort(port: number | string): Port {
  const portNum = typeof port === 'string' ? Number(port) : port;
  if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
    throw createConfigurationError(`Invalid port: ${port}`);
  }
  return portNum as Port;
}
```

### JSON Schema Integration

Leveraging type-fest for JSON handling:

```typescript
import type { JsonValue, JsonObject } from 'type-fest';

export type OasRequestArgs = JsonObject;
export type ToolArguments = JsonObject;
export type ResponseData = JsonValue;
```

## Error Handling

### Domain-Specific Errors

Structured error handling with context:

```typescript
export function createConfigurationError(
  message: string,
  context?: Record<string, unknown>,
): QuickMcpError {
  return new QuickMcpError('CONFIGURATION_ERROR', message, context);
}

// Usage with context
throw createConfigurationError('Invalid OpenAPI spec URL', {
  url: inputUrl,
  validProtocols: ['http', 'https', 'file'],
});
```

### Error Boundaries

Clear separation between error types:

- **Configuration Errors**: Invalid setup, missing required values
- **Network Errors**: HTTP failures, timeouts, connectivity issues
- **Validation Errors**: Malformed OpenAPI specs, invalid arguments
- **Runtime Errors**: Unexpected failures during processing

## Transport Layer

### Multiple Transport Support

```typescript
interface TransportAdapter {
  start(server: McpServer): Promise<TransportInfo>;
  stop(): Promise<void>;
}

class HttpTransport implements TransportAdapter {
  // HTTP server for MCP over HTTP
}

class StdioTransport implements TransportAdapter {
  // Standard I/O for direct CLI usage
}
```

**Design Decision**: Abstract transport to support both HTTP (for web clients)
and stdio (for CLI usage).

## Configuration Management

### 12-Factor App Compliance

Environment-based configuration with validation:

```typescript
interface EnvironmentConfig {
  readonly PORT?: string;
  readonly OPENAPI_SPEC_URL?: string;
  readonly BASE_URL?: string;
  readonly LOG_LEVEL?: LogLevel;
  readonly TRANSPORT?: TransportType;
  readonly AUTH_HEADERS?: string; // JSON string
}

function loadEnvironmentConfig(): EnvironmentConfig {
  // Extract from process.env with validation
}
```

### Configuration Layers

1. **Environment Variables**: Primary configuration source
2. **CLI Arguments**: Override environment settings
3. **Defaults**: Sensible fallbacks for optional settings

## Performance Considerations

### Memory Management

- **Streaming**: Large OpenAPI specs processed incrementally
- **Limits**: Maximum spec size and operation count enforced
- **Cleanup**: Proper resource disposal and connection pooling

### Caching Strategy

- **Spec Caching**: Parsed OpenAPI specs cached by URL
- **Operation Caching**: Processed operations cached for reuse
- **TTL**: Time-based invalidation for remote specs

## Security Model

### Authentication Forwarding

```typescript
// Forward auth headers from MCP client to API
const authHeaders = parseHeadersFromJSON(env.AUTH_HEADERS);
authHeaders.forEach((value, key) => {
  request.headers.set(key, value);
});
```

### Input Validation

- **URL Validation**: Only allow http/https/file protocols
- **Parameter Validation**: Validate against OpenAPI parameter schemas
- **Size Limits**: Prevent DoS via large payloads

### Isolation

- **Process Isolation**: Each proxy instance is independent
- **Environment Isolation**: Configuration via environment variables
- **Network Isolation**: Only configured API endpoints accessible

## Deployment Architecture

### Stateless Design

- **No Persistent State**: All state derived from OpenAPI spec
- **Horizontal Scaling**: Multiple instances can run independently
- **Health Checks**: Simple endpoint for load balancer health checks

### Container Ready

```dockerfile
# Multi-stage build for minimal runtime image
FROM node:18-alpine AS builder
# ... build steps

FROM node:18-alpine AS runtime
# ... runtime configuration
```

## Future Considerations

### Planned Enhancements

1. **OpenAPI Security Schemes**: Full support for auth mechanisms
2. **Schema Validation**: Request/response validation against OpenAPI schemas
3. **Observability**: Metrics, tracing, and structured logging
4. **Caching**: Response caching with TTL and invalidation
5. **Rate Limiting**: Request rate limiting per client/endpoint

### Architectural Evolution

- **Plugin System**: Extensible middleware for custom behavior
- **Multi-Protocol**: Support for GraphQL, gRPC in addition to REST
- **Edge Deployment**: Optimizations for edge computing environments

---

This architecture balances simplicity with extensibility, providing a solid
foundation for converting REST APIs to MCP tools while maintaining
production-ready quality and performance characteristics.
