# Testing Architecture Decisions

This document records key decisions about Quick-MCP's testing approach and infrastructure.

## Decision: SuperTest for HTTP Server Testing

**Date**: 2025-05-28  
**Status**: Adopted  
**Decision Makers**: Development Team  

### Context

Quick-MCP is fundamentally an HTTP proxy server that converts between MCP and REST protocols. Testing this requires:

1. **Real HTTP request/response flows** - Core functionality involves actual network behavior
2. **Timeout testing** - Need to verify configurable timeout behavior works correctly  
3. **Authentication forwarding** - Must test that headers pass through correctly
4. **Error handling** - Network errors, timeouts, and malformed responses
5. **No mocks policy** - Project philosophy favors real implementations over mocking

### Alternatives Considered

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Mock fetch()** | Fast, isolated | Doesn't test real HTTP behavior | ❌ Violates no-mocks policy |
| **Raw http module** | Full control | Verbose, manual server lifecycle | ❌ Too much boilerplate |
| **axios + test server** | Familiar API | Manual server management | ⚠️ More setup required |
| **SuperTest** | Real HTTP, auto-managed | Express ecosystem specific | ✅ **Selected** |

### Decision: SuperTest

We adopt **SuperTest** as our primary HTTP testing infrastructure because:

#### ✅ **Aligns with Philosophy**

- **No mocking**: Tests real HTTP servers and request flows
- **Real implementations**: Uses actual Express servers, not simulated behavior
- **Controlled inputs**: We control the test server endpoints and responses

#### ✅ **Technical Benefits**

- **Auto-management**: Automatically starts/stops test servers on ephemeral ports
- **Fluent API**: Clean, readable test syntax with built-in assertions
- **Timeout support**: Built on SuperAgent which has robust timeout handling
- **Industry standard**: Battle-tested in Express.js ecosystem (13k+ GitHub stars)

#### ✅ **Testing Capabilities**

- **Real timeouts**: Can test actual network timeout behavior
- **Authentication**: Tests real header forwarding through HTTP stack  
- **Error conditions**: Network errors, malformed responses, connection failures
- **Performance**: Can measure real response times and latency

### Implementation Strategy

#### 1. **Test Server Architecture**

```typescript
// Real Express server with artificial delays for timeout testing
app.get('/slow/:seconds', (req, res) => {
  const delay = parseInt(req.params.seconds) * 1000;
  setTimeout(() => res.json({ delayed: delay }), delay);
});

app.get('/error/:code', (req, res) => {
  res.status(parseInt(req.params.code)).json({ error: 'Test error' });
});
```

#### 2. **SuperTest Test Pattern**

```typescript
import request from 'supertest';
import { createServer } from '@quick-mcp/core';

describe('Quick-MCP HTTP Behavior', () => {
  it('should timeout on slow endpoints', async () => {
    const server = await createServer({
      spec: 'http://localhost:3001/api-docs.json',
      requestTimeoutMs: 2000  // 2 second timeout
    });

    // Test against real slow endpoint (5 seconds)
    await request(server)
      .post('/mcp')
      .send({ method: 'tools/call', params: { name: 'slowEndpoint' } })
      .expect(408); // Request Timeout
  });
});
```

#### 3. **Dependencies**

```json
{
  "devDependencies": {
    "supertest": "^6.3.0",
    "@types/supertest": "^2.0.12"
  }
}
```

### Success Metrics

- ✅ **Real HTTP flows tested** - No mocked network behavior
- ✅ **Timeout behavior verified** - Actual timeout errors, not simulated
- ✅ **Authentication tested** - Real header forwarding through HTTP stack
- ✅ **Error conditions covered** - Network failures, malformed responses
- ✅ **Maintainable tests** - Clear, readable test code with minimal setup

### Consequences

#### ✅ **Positive**

- Tests reflect real-world usage patterns
- Higher confidence in HTTP behavior
- Catches integration issues that mocks miss
- Aligns with project's "no mocks" philosophy

#### ⚠️ **Trade-offs**

- Tests may be slightly slower than pure unit tests
- Requires managing test server lifecycle
- Express ecosystem dependency (acceptable given existing demo server)

### References

- [SuperTest GitHub](https://github.com/ladjs/supertest) - Official repository
- [SuperAgent Documentation](https://ladjs.github.io/superagent/) - Underlying HTTP client
- [Express Testing Guide](https://expressjs.com/en/guide/testing.html) - Express.js testing patterns
- [Quick-MCP Testing Philosophy](../CLAUDE.md#development-standards) - Project testing guidelines

### Review Schedule

This decision will be reviewed if:

- SuperTest maintenance status changes significantly
- Alternative testing approaches emerge that better align with our philosophy
- Performance issues arise that require reconsidering the approach

---

*This decision record follows the Architecture Decision Record (ADR) format to maintain transparency and context for future development.*
