# Quick-MCP Architecture & Abstractions Guide

## 🎯 Learning Path

### 1. **Start with Domain Objects** (Foundation)

These are the core value objects that enforce business rules:

#### **Port** (`domain/port.ts`)

- Validates port numbers (1-65535)
- Factory methods: `fromNumber()`, `parse()`, `default()`
- Learn: Value object pattern, validation at construction

#### **Headers** (`domain/headers.ts`)

- Immutable HTTP header management
- Factory methods: `fromEntries()`, `parse()`, `empty()`
- Learn: Immutable data structures, builder pattern

#### **SpecUrl** (`domain/spec-url.ts`)

- Validates OpenAPI spec URLs (http/https/file protocols)
- Factory methods: `fromString()`, `fromFilePath()`
- Learn: URL validation, protocol handling

### 2. **Configuration System** (`config.ts`)

- **ServerOptions**: Core configuration interface
- **ConfigurationBuilder**: Immutable builder pattern
- Learn: Builder pattern, environment variable handling, domain object integration

### 3. **Core Flow: OpenAPI → MCP**

#### **Entry Point** (`openapi.ts`)

```typescript
OpenApiSpec.load(path) → OpenApiSpec
  ├── createTools() → MCP Tools
  └── createResources() → MCP Resources
```

#### **Operation Abstraction** (`operation/ext.ts`)

- **QuickMcpOperation**: Wraps OpenAPI operations
- Handles custom extensions (`x-quick-mcp`)
- Learn: Adapter pattern, OpenAPI extensions

### 4. **Request/Response Pipeline**

#### **Request Building** (`request/request-builder.ts`)

```typescript
MCP Arguments → buildRequest() → HTTP Request
  ├── URL template expansion
  ├── Query parameter handling
  └── Header injection
```

#### **Response Handling** (`response/response-handler.ts`)

```typescript
HTTP Response → ResponseHandler → MCP Result
  ├── Error handling (status >= 400)
  ├── Content type processing
  └── Schema validation
```

### 5. **Client & Transport Layer**

#### **OperationClient** (`client.ts`)

- Bridges MCP calls to HTTP requests
- Handles both tools and resources
- Learn: Strategy pattern, async operations

#### **Transport** (`transport/`)

- HTTP and STDIO transport implementations
- Learn: Abstract factory pattern

## 📚 Key Abstractions to Master

### 1. **Operation-Centric Design**

Every OpenAPI operation becomes a `QuickMcpOperation` that knows how to:

- Describe itself for MCP
- Convert arguments to HTTP requests
- Handle responses appropriately

### 2. **Type-Safe Schema Pipeline**

```
OpenAPI Schema → JSONSchema → Zod Schema
```

- Each transformation preserves type safety
- Validation at each boundary

### 3. **Error Hierarchy**

- `ConfigurationError`: Setup/config issues
- `OpenApiError`: Spec parsing problems
- `TransportError`: Network/communication failures
- `ServerError`: Runtime server issues

### 4. **Immutable Configuration**

- All configuration is immutable after creation
- Builder pattern for construction
- Domain objects for validation

## 🔍 Code Reading Order

1. **Start Simple**: Read `domain/port.ts` to understand value objects
2. **Configuration**: Study `config.ts` and how builders work
3. **Core Flow**: Follow `openapi.ts` → `operation/ext.ts`
4. **Request/Response**: Trace through `request-builder.ts` → `response-handler.ts`
5. **Integration**: See how `client.ts` ties everything together

## 🧪 Learning Exercises

### Exercise 1: Trace a Tool Call

1. Start at `OpenApiSpec.createTools()`
2. Follow how an operation becomes a tool
3. Trace how arguments flow through `OperationClient`
4. See how `buildRequest()` constructs the HTTP request
5. Follow response handling back to MCP format

### Exercise 2: Add a Domain Object

1. Create a new value object (e.g., `ContentType`)
2. Add validation rules
3. Create factory methods
4. Integrate with existing code

### Exercise 3: Understand Extension System

1. Look at `x-quick-mcp` handling in `operation/ext.ts`
2. See how `CustomExtensions` class works
3. Trace how extensions affect request/response handling

## 💡 Key Patterns Used

### **Value Object Pattern**

- Domain objects (Port, Headers, SpecUrl) encapsulate validation
- Immutable after construction
- Factory methods for creation

### **Builder Pattern**

- `ConfigurationBuilder` for complex object construction
- Immutable updates with method chaining

### **Strategy Pattern**

- Different handling for tools vs resources
- Transport selection (HTTP vs STDIO)

### **Adapter Pattern**

- `QuickMcpOperation` adapts OpenAPI to MCP concepts
- `ResponseHandler` adapts HTTP responses to MCP format

### **Factory Pattern**

- `createTransport()` for transport selection
- Domain object factory methods

## 🚀 Next Steps

1. **Run the Demo**:

   ```bash
   pnpm dev:demo  # Start demo API
   pnpm quick-mcp # Run Quick-MCP
   ```

2. **Write Tests**: Best way to understand is to write tests for existing code

3. **Debug Through**: Set breakpoints and trace real requests

4. **Extend**: Try adding a new feature to solidify understanding

## 📖 Additional Resources

- **Tests**: Read test files for usage examples
- **Types**: TypeScript types document the contracts
- **Comments**: JSDoc comments explain "why" not just "what"
