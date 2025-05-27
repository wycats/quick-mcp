# Hands-On Learning Guide for Quick-MCP

## 🚀 Quick Start Exploration

### Step 1: Run the Demo and Trace

```bash
# Terminal 1: Start demo API (runs on port 3001)
pnpm dev:demo
# Wait for "Demo API server running at http://localhost:3001" message

# Terminal 2: Run Quick-MCP with debug logging (AFTER demo is running)
DEBUG=* pnpm dev --spec http://localhost:3001/api-docs.json --port 8080 \
  --transport http

# Terminal 3: Use the MCP Inspector (if available)
npx @modelcontextprotocol/inspector

# Alternative: Use the built-in parallel command
# pnpm demo:test  # Runs both demo server and Quick-MCP together
```

### Step 2: Set Strategic Breakpoints

Add these breakpoints to understand the flow:

1. **Entry Point**: `cli.ts:50` - Where CLI args become configuration
2. **Spec Loading**: `openapi.ts:29` - How OpenAPI specs are loaded
3. **Tool Creation**: `openapi.ts:87` - How operations become tools
4. **Request Building**: `request/request-builder.ts:24` - How MCP args become
   HTTP
5. **Response Handling**: `response/response-handler.ts:68` - How HTTP becomes
   MCP

## 📖 Code Reading Exercises

### Exercise 1: Understanding Type Safety

```typescript
// Read these files in order:
1. types.ts - Simple type aliases with validation functions
2. config.ts - Configuration with environment parsing
3. errors/index.ts - Error handling with context

// Questions to answer:
- How do branded types provide type safety?
- What validation happens at runtime?
- How are errors structured with context?
```

### Exercise 2: Trace a GET Request

```typescript
// Start at: openapi.ts → createResources()
// Follow the path:
1. How does it identify resource operations?
2. How does QuickMcpOperation.isResource() work?
3. What makes a GET operation a "resource"?
4. How are path parameters handled?
```

### Exercise 3: Understand Schema Conversion

```typescript
// Start at: parameter-mapper.ts → getJsonSchema()
// Trace:
1. How OpenAPI schemas are extracted
2. How they convert to JSONSchema
3. How JSONSchema becomes Zod schemas
4. Where validation happens
```

## 🧪 Experimentation Tasks

### Task 1: Add a New Branded Type

Add a `ContentType` branded type:

```typescript
// In types.ts
import type { Tagged } from 'type-fest';

export type ContentType = Tagged<string, 'ContentType'>;

export function validateContentType(value: string): ContentType {
  // Validate MIME type format
  if (!/^[a-z]+\/[a-z0-9][a-z0-9!#$&\-\^_]*$/i.test(value)) {
    throw createConfigurationError(`Invalid content type: ${value}`, {
      contentType: value,
    });
  }
  return value as ContentType;
}

export function isJsonContentType(contentType: ContentType): boolean {
  return contentType === 'application/json';
}
```

### Task 2: Add Custom Logging

Add logging to trace request flow:

```typescript
// In request/request-builder.ts
export function buildRequest(
  app: { log: LogLayer },
  op: QuickMcpOperation,
  args: OasRequestArgs,
): Request {
  console.log('🔵 Building request for:', op.describe());
  console.log('📦 Arguments:', JSON.stringify(args, null, 2));

  // Existing code...

  console.log('🎯 Final URL:', url.toString());
  console.log('📋 Headers:', Object.fromEntries(headers));
  return request;
}
```

### Task 3: Write a Test

Write a test for branded type validation:

```typescript
// types.test.ts
import { validatePort, validateSpecUrl } from './types.ts';

describe('Type validation', () => {
  describe('validatePort', () => {
    it('should validate port range', () => {
      expect(() => validatePort(0)).toThrow();
      expect(() => validatePort(65536)).toThrow();
      expect(validatePort(8080)).toBe(8080);
    });

    it('should parse string ports', () => {
      expect(validatePort('3000')).toBe(3000);
      expect(() => validatePort('abc')).toThrow();
    });
  });

  describe('validateSpecUrl', () => {
    it('should validate URL format', () => {
      expect(validateSpecUrl('https://api.example.com/openapi.json')).toBe(
        'https://api.example.com/openapi.json',
      );
      expect(() => validateSpecUrl('not-a-url')).toThrow();
    });
  });
});
```

## 🔍 Deep Dive Topics

### 1. **The Operation Abstraction**

```typescript
// Key questions:
- Why wrap Operation in QuickMcpOperation?
- How do extensions affect behavior?
- What's the difference between tool and resource operations?
```

### 2. **Error Handling Strategy**

```typescript
// Explore:
- How errors bubble up through layers
- Where errors are caught and transformed
- How error context is preserved
```

### 3. **Configuration Management**

```typescript
// Understand:
- How environment variables are parsed in config.ts
- How defaults are applied with nullish coalescing
- How branded types enforce validity at runtime
```

## 🎯 Learning Checkpoints

### Checkpoint 1: Type Safety Understanding

- [ ] Can explain how branded types provide type safety
- [ ] Understand validation function patterns
- [ ] Can add runtime validation to a branded type

### Checkpoint 2: Flow Understanding

- [ ] Can trace a request from CLI to HTTP
- [ ] Understand how responses are transformed
- [ ] Know where validation happens

### Checkpoint 3: Architecture Understanding

- [ ] Can explain the layer separation
- [ ] Understand the abstraction purposes
- [ ] Can extend with new features

## 💡 Pro Tips

1. **Use TypeScript**: Let the types guide you

   ```typescript
   // Hover over types in your IDE
   // Follow "Go to Definition"
   // Check what interfaces are implemented
   ```

2. **Read Tests First**: Tests show intended usage

   ```typescript
   // Look for describe() blocks
   // Tests often show edge cases
   // Test names document behavior
   ```

3. **Debug, Don't Just Read**:

   ```typescript
   // Add console.logs
   // Use debugger statements
   // Inspect objects at runtime
   ```

4. **Draw It Out**: Sketch the flow on paper as you trace through

## 🚧 Common Confusion Points

1. **Operation vs QuickMcpOperation**: One is from the OAS library, one is our
   wrapper
2. **Tool vs Resource**: Resources are safe GET operations with only path params
3. **Schema Types**: OpenAPI Schema ≠ JSONSchema ≠ Zod Schema (but they convert)
4. **Async Everywhere**: Most operations are async due to network I/O

## 📚 Next Steps

1. **Implement a Feature**: Add request timeout support
2. **Fix a Bug**: Find and fix an edge case
3. **Optimize**: Improve performance somewhere
4. **Document**: Add JSDoc to undocumented functions
