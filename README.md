# Quick-MCP

**Status: Proof of Concept** - Not production ready

Converts OpenAPI specifications to Model Context Protocol (MCP) tools for AI assistants.

## What Works

- ✅ **Core OpenAPI Parsing**: Loads and validates OpenAPI 3.0 specifications
- ✅ **MCP Tool Generation**: Converts operations to MCP tools and resources  
- ✅ **HTTP Proxying**: Forwards tool calls as HTTP requests with parameter mapping
- ✅ **Safety Classification**: Categorizes operations by HTTP verb (readonly, update, delete)
- ✅ **Custom Extensions**: Basic support for `x-quick-mcp` extensions
- ✅ **Demo Setup**: Working demo with test API server

## What's Missing

- ❌ **Production Readiness**: No error boundaries, timeouts, or retry logic
- ❌ **Comprehensive Testing**: Transport layer and edge cases untested (44% coverage)
- ❌ **Published Package**: Not available on npm despite some documentation claims
- ❌ **Authentication**: Only basic header forwarding, no OpenAPI security schemes
- ❌ **Monitoring**: No observability, health checks, or metrics
- ❌ **Error Handling**: Basic error types but inconsistent usage

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm

### Try the Demo
```bash
# Clone and install
git clone <repository-url>
cd quick-mcp
pnpm install

# Terminal 1: Start demo API server
pnpm dev:demo

# Terminal 2: Start Quick-MCP proxy (after demo is running)
pnpm dev --spec http://localhost:3001/api-docs.json --port 8080 --transport http
```

The demo converts a sample OpenAPI spec into MCP tools that can be used by Claude or other MCP clients.

### Use with Your API
```bash
# Start Quick-MCP pointing to your OpenAPI spec
pnpm dev --spec https://your-api.com/openapi.json --port 8080 --transport http
```

## How It Works

1. **Spec Loading**: Fetches and validates OpenAPI specification
2. **Tool Generation**: Converts operations to MCP tool definitions
3. **Resource Classification**: GET operations with path-only params become resources
4. **Proxy Requests**: Tool calls are converted to HTTP requests with proper parameter mapping
5. **Response Handling**: API responses are formatted for MCP clients

## Architecture

```
OpenAPI Spec → Quick-MCP → MCP Tools → AI Assistant
                   ↓
             HTTP API Requests
```

- **packages/core**: Main conversion library  
- **packages/demo**: Test API server with sample endpoints
- **tests**: Integration tests with custom MCP matchers

## Development

See [DEVELOPMENT_PRACTICES.md](DEVELOPMENT_PRACTICES.md) for development workflows and AI-assisted coding practices.

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build
pnpm build

# Lint
pnpm lint
```

## Roadmap

### Phase 1: Production Readiness
- [ ] Add comprehensive error handling with timeouts and retries
- [ ] Achieve >70% test coverage including transport layer
- [ ] Implement proper authentication support  
- [ ] Add basic monitoring and health checks

### Phase 2: Enhanced Features  
- [ ] Support for OpenAPI security schemes
- [ ] Request/response validation against schemas
- [ ] Caching and performance optimizations
- [ ] Debug UI for development

### Phase 3: Distribution
- [ ] Publish npm package
- [ ] Docker container
- [ ] Production deployment guides
- [ ] CLI tool distribution

## Contributing

This project follows a two-phase development process:
1. **Exploration**: Rapid prototyping with AI assistance
2. **Consolidation**: Manual refinement to production quality

See [DEVELOPMENT_PRACTICES.md](DEVELOPMENT_PRACTICES.md) for detailed guidelines.

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Note**: This project is currently in the consolidation phase, transforming proof-of-concept code into production-ready software. Contributions welcome, especially for testing, error handling, and production hardening.