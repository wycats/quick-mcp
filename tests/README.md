# Quick-MCP Integration Tests

This package contains integration tests for the Quick-MCP library that verify the public API functionality.

## Purpose

Unlike unit tests (located in `packages/*/src/**/*.test.ts`), these integration tests:

- Import only from the public API (`@quick-mcp/core`) rather than internal interfaces
- Test end-to-end workflows from input to output
- Verify the behavior of multiple components working together
- Serve as usage examples for consumers of the library

## Running Tests

```bash
# Run integration tests only
pnpm --filter @quick-mcp/tests test

# Run integration tests in watch mode
pnpm --filter @quick-mcp/tests test:watch
```

## Test Organization

Tests are organized by feature area:

- `resource-registration.test.ts` - Tests for proper registration of resources from OpenAPI specs
- (Additional test files will be added here)

## Testing Infrastructure

### SuperTest for HTTP Testing

Quick-MCP uses **SuperTest** for all HTTP server testing to maintain our "no mocks" philosophy:

- **Real HTTP servers**: Tests actual Express/HTTP servers, not mocked behavior
- **Timeout testing**: Enables testing real network timeouts with slow endpoints
- **Auto-management**: Handles server start/stop lifecycle automatically
- **Fluent assertions**: Clean, readable HTTP test syntax

### Example Usage

```typescript
import request from 'supertest';
import { createServer } from '@quick-mcp/core';

// Test real MCP server behavior
const server = await createServer({
  spec: 'http://localhost:3001/api-docs.json',
  requestTimeoutMs: 5000
});

const response = await request(server)
  .post('/mcp')
  .send({ method: 'tools/call', params: { name: 'listUsers' } })
  .expect(200)
  .expect('Content-Type', /json/);
```

### Timeout Testing Strategy

For testing timeout behavior, we create real slow endpoints rather than mocking:

```javascript
// Demo server with artificial delays
app.get('/slow/:seconds', (req, res) => {
  const delay = parseInt(req.params.seconds) * 1000;
  setTimeout(() => res.json({ delayed: delay }), delay);
});
```

This approach ensures we test **actual timeout behavior** in the HTTP stack rather than simulated timeouts.

## Writing Integration Tests

When writing integration tests:

1. Only import from the public API (`@quick-mcp/core`)
2. Do not access internal implementation details
3. Focus on verifying the end-to-end behavior 
4. Maintain proper test isolation by creating fresh instances for each test
