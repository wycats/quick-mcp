# Public APIs with OpenAPI Specifications for Testing

Research compiled for @quick-mcp/test - LLM-powered MCP testing tool.

## 🎯 Testing-Friendly APIs (No Auth Required)

### 1. JSONPlaceholder
- **URL**: https://jsonplaceholder.typicode.com
- **Description**: Free fake REST API for testing and prototyping
- **Endpoints**: `/posts`, `/comments`, `/albums`, `/photos`, `/todos`, `/users`
- **OpenAPI Spec**: Not officially provided (community specs may exist)
- **Perfect for**: Basic CRUD operation testing, simple data structures
- **Example Usage**: 
  ```bash
  GET https://jsonplaceholder.typicode.com/posts/1
  GET https://jsonplaceholder.typicode.com/users
  ```

### 2. HTTPBin
- **URL**: https://httpbin.org
- **Description**: HTTP request & response service for testing
- **OpenAPI Spec**: Available at Azure samples - `httpbin.swagger.json`
- **Endpoints**: `/status/{code}`, `/get`, `/post`, `/headers`, `/cookies`
- **Perfect for**: HTTP method testing, status code validation, header inspection
- **Example Usage**:
  ```bash
  GET https://httpbin.org/get
  POST https://httpbin.org/post
  GET https://httpbin.org/status/200
  ```

### 3. Swagger Petstore (Classic Example)
- **URL**: https://petstore.swagger.io
- **Description**: Classic OpenAPI example API
- **OpenAPI Spec**: Built-in Swagger UI with full spec
- **Perfect for**: Testing OpenAPI tooling, standard operations
- **Endpoints**: Pet management, store inventory, user management

## 🏢 Production APIs with OpenAPI Specs

### 4. GitHub REST API
- **URL**: https://api.github.com
- **Description**: GitHub's REST API for repository management
- **OpenAPI Spec**: https://github.com/github/rest-api-description
- **Authentication**: Required for most operations
- **Perfect for**: Complex API testing, authentication patterns
- **Note**: Rate limited without auth

### 5. APIs.guru Directory
- **URL**: https://api.apis.guru
- **Description**: Directory of REST API definitions in OpenAPI format
- **OpenAPI Spec**: Self-documenting
- **Endpoints**: `/v2/list.json`, `/v2/specs/{provider}/{api}.json`
- **Perfect for**: Discovering other APIs, metadata testing

## 🛠️ Developer-Friendly Testing APIs

### 6. RESTful API (placeholder replacement)
- **URL**: https://restful-api.dev  
- **Description**: RESTful API for testing (objects/devices)
- **Endpoints**: `/objects` (CRUD operations)
- **Perfect for**: Modern REST patterns, JSON responses

### 7. Cat Facts API
- **URL**: https://catfact.ninja
- **Description**: Random cat facts for testing
- **Endpoints**: `/fact`, `/facts`, `/breeds`
- **Perfect for**: Simple GET requests, random data

### 8. Dog CEO API
- **URL**: https://dog.ceo/dog-api
- **Description**: Dog images API
- **Endpoints**: `/breeds/list/all`, `/breeds/image/random`
- **Perfect for**: Image URL responses, simple structure

## 📋 Recommended Testing Strategy

### Phase 1: Simple APIs (Start Here)
1. **JSONPlaceholder** - Basic CRUD operations
2. **HTTPBin** - HTTP method validation  
3. **Cat Facts** - Simple GET requests

### Phase 2: Structured APIs
1. **RESTful API** - Modern REST patterns
2. **Dog CEO API** - Media responses
3. **Swagger Petstore** - Standard OpenAPI example

### Phase 3: Complex APIs
1. **APIs.guru** - Metadata and discovery
2. **GitHub API** (with auth) - Production patterns

## 🔧 Creating OpenAPI Specs for Testing

For APIs without official OpenAPI specs, we can:

### Option A: Use Community Specs
- Check APIs.guru directory
- GitHub repositories with community specs
- Swagger Hub public APIs

### Option B: Create Minimal Specs
Generate basic OpenAPI specs for simple APIs:

```yaml
# jsonplaceholder-basic.yaml
openapi: 3.0.0
info:
  title: JSONPlaceholder API
  version: 1.0.0
servers:
  - url: https://jsonplaceholder.typicode.com
paths:
  /posts:
    get:
      summary: Get all posts
      responses:
        '200':
          description: List of posts
  /posts/{id}:
    get:
      summary: Get post by ID
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Single post
```

## 🎯 Best APIs for @quick-mcp/test

**Recommended priority order:**

1. **JSONPlaceholder** - Perfect starter API (simple, reliable, diverse endpoints)
2. **HTTPBin** - Essential for testing HTTP semantics  
3. **Swagger Petstore** - Standard OpenAPI reference
4. **Dog CEO API** - Different response patterns
5. **APIs.guru** - Meta-testing (API about APIs)

## 🚀 Quick Start Commands

Test these APIs with our tool:

```bash
# Option 1: Use JSONPlaceholder
node --experimental-strip-types src/cli.ts \
  --spec https://jsonplaceholder.typicode.com \
  --model gpt-4o-mini \
  --scenarios basic

# Option 2: Use HTTPBin  
node --experimental-strip-types src/cli.ts \
  --spec https://httpbin.org \
  --model gpt-4o-mini \
  --scenarios basic

# Option 3: Use Petstore
node --experimental-strip-types src/cli.ts \
  --spec https://petstore.swagger.io/v2/swagger.json \
  --model gpt-4o-mini \
  --scenarios comprehensive
```

## 📚 Additional Resources

- **APIs.guru Directory**: 2,337+ APIs with OpenAPI specs
- **Public APIs GitHub**: Curated list of free APIs  
- **OpenAPI.tools**: Community tools and resources
- **Swagger Hub**: Public API registry

---

*Research compiled: January 2025*  
*For: Quick-MCP LLM-powered testing tool*