# @quick-mcp/core

**Dynamic proxy that converts OpenAPI specifications into Model Context Protocol (MCP) tools and resources in real-time.**

[![npm version](https://badge.fury.io/js/@quick-mcp/core.svg)](https://www.npmjs.com/package/@quick-mcp/core)

Transform any OpenAPI-documented REST API into MCP tools that AI assistants can use directly. No code generation, no manual integration - just point Quick-MCP at your OpenAPI spec and start using your API with Claude, ChatGPT, or any MCP-compatible AI assistant.

## Installation

```bash
npm install -g @quick-mcp/core
```

## Quick Start

### Basic Usage

```bash
# Start MCP server from OpenAPI spec
quick-mcp --spec https://api.example.com/openapi.json

# Use local file
quick-mcp --spec ./api-spec.yaml --port 8080
```

### With Authentication

```bash
# Add API key header
quick-mcp --spec https://api.example.com/openapi.json \
  --header "Authorization: Bearer YOUR_API_KEY"

# Multiple headers
quick-mcp --spec https://api.example.com/openapi.json \
  --header "Authorization: Bearer TOKEN" \
  --header "X-API-Key: KEY"
```

### Environment Configuration

```bash
# Set environment variables
export OPENAPI_SPEC_URL="https://api.example.com/openapi.json"
export REQUEST_TIMEOUT_MS="60000"
export AUTH_HEADERS='{"Authorization": "Bearer YOUR_TOKEN"}'

# Run with environment config
quick-mcp --env
```

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--spec <path>` | OpenAPI specification URL or file path | Required |
| `--port <number>` | MCP server port | 8080 |
| `--transport <type>` | Transport: `http` or `stdio` | http |
| `--timeout <ms>` | Request timeout in milliseconds | 30000 |
| `--header <header>` | Custom header (format: "Name: Value") | None |
| `--base-url <url>` | Override API base URL | From spec |
| `--log-level <level>` | Log level: trace, debug, info, warn, error, fatal | warn |
| `--env` | Load configuration from environment variables | false |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAPI_SPEC_URL` | OpenAPI specification URL |
| `PORT` | Server port |
| `REQUEST_TIMEOUT_MS` | Request timeout (1000-300000ms) |
| `TRANSPORT` | Transport type (http or stdio) |
| `BASE_URL` | API base URL override |
| `LOG_LEVEL` | Logging level |
| `AUTH_HEADERS` | JSON object with headers |

## Programmatic API

```typescript
import { createServer, createAppContext } from '@quick-mcp/core';

// Create and start server
const server = await createServer({
  app: createAppContext('info'),
  spec: 'https://api.example.com/openapi.json',
  port: 8080,
  transport: 'http',
  requestTimeoutMs: 30000,
  headers: new Headers({
    'Authorization': 'Bearer YOUR_TOKEN'
  })
});

await server.start();
```

## How It Works

Quick-MCP automatically converts your OpenAPI specification into MCP tools:

- **GET operations** → MCP Resources (for data retrieval)
- **POST/PUT/DELETE operations** → MCP Tools (for actions)
- **Path parameters** → Required MCP arguments
- **Query parameters** → Optional MCP arguments
- **Request bodies** → MCP argument objects

## Authentication

Pass authentication headers through to your API:

```bash
# API Key
quick-mcp --spec https://api.example.com/openapi.json \
  --header "X-API-Key: your-key"

# Bearer Token
quick-mcp --spec https://api.example.com/openapi.json \
  --header "Authorization: Bearer your-token"

# Multiple headers via environment
export AUTH_HEADERS='{
  "Authorization": "Bearer token",
  "X-API-Key": "key",
  "X-Custom-Header": "value"
}'
quick-mcp --spec https://api.example.com/openapi.json --env
```

## Error Handling

Quick-MCP provides robust error handling:

- **Timeout errors**: Configurable request timeouts (1s - 5min)
- **Network errors**: Detailed error context with operation info
- **Validation errors**: Schema validation for requests and responses
- **Authentication errors**: Clear error messages for auth failures

## Production Deployment

### Docker

```dockerfile
FROM node:18-alpine
COPY . /app
WORKDIR /app
RUN npm install -g @quick-mcp/core
EXPOSE 8080
CMD ["quick-mcp", "--spec", "/app/openapi.json", "--env"]
```

### Heroku

```bash
# Set environment variables
heroku config:set OPENAPI_SPEC_URL="https://your-api.com/openapi.json"
heroku config:set PORT="8080"
heroku config:set REQUEST_TIMEOUT_MS="60000"

# Deploy
git push heroku main
```

## Supported OpenAPI Features

- ✅ OpenAPI 2.0, 3.0, 3.1
- ✅ JSON and YAML formats
- ✅ Path parameters
- ✅ Query parameters
- ✅ Request bodies (JSON)
- ✅ Response schemas
- ✅ Authentication headers
- ✅ Base URL overrides
- ✅ Custom extensions (`x-quick-mcp`)

## Examples

### GitHub API

```bash
quick-mcp --spec https://api.github.com/openapi.json \
  --header "Authorization: token YOUR_GITHUB_TOKEN"
```

### Stripe API

```bash
quick-mcp --spec https://stripe.com/docs/api/openapi.yaml \
  --header "Authorization: Bearer sk_test_..."
```

### Custom API

```bash
quick-mcp --spec ./my-api.yaml \
  --base-url https://my-api.production.com \
  --timeout 60000
```

## Troubleshooting

### Common Issues

**Connection refused:**
```bash
# Check if your API is accessible
curl https://api.example.com/openapi.json
```

**Timeout errors:**
```bash
# Increase timeout for slow APIs
quick-mcp --spec https://api.example.com/openapi.json --timeout 60000
```

**Authentication errors:**
```bash
# Verify headers format
quick-mcp --spec https://api.example.com/openapi.json \
  --header "Authorization: Bearer YOUR_TOKEN" \
  --log-level debug
```

## Links

- 📖 [Full Documentation](https://github.com/wycats/quick-mcp)
- 🔧 [API Reference](https://github.com/wycats/quick-mcp/blob/main/API.md)
- 🏗️ [Architecture Guide](https://github.com/wycats/quick-mcp/blob/main/ARCHITECTURE.md)
- 🤝 [Contributing](https://github.com/wycats/quick-mcp/blob/main/CONTRIBUTING.md)
- 🐛 [Issues](https://github.com/wycats/quick-mcp/issues)

## License

MIT