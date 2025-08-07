# Containerizing Quick-MCP

Quick-MCP can be containerized using different approaches depending on your deployment platform and preferences.

## 🚀 Cloud Native Buildpacks (Recommended)

Cloud Native Buildpacks provide a simpler, more secure, and maintainable way to containerize Quick-MCP without writing Dockerfiles.

### Why Heroku Buildpacks?

- **Perfect Match**: Quick-MCP follows 12-factor app principles, same as Heroku
- **Zero Configuration**: Automatically detects Node.js and pnpm
- **Security**: Regularly updated base images with security patches  
- **Performance**: Optimized for Node.js applications like Quick-MCP
- **Consistency**: Same runtime environment whether on Heroku or other platforms
- **No Dockerfile Maintenance**: No need to update Node versions, security patches, etc.

### Using Pack CLI

Install the `pack` CLI tool:

```bash
# macOS
brew install buildpacks/tap/pack

# Linux
curl -sSL "https://github.com/buildpacks/pack/releases/download/v0.32.1/pack-v0.32.1-linux.tgz" | sudo tar -C /usr/local/bin/ --no-same-owner -xzv pack

# Windows
scoop install pack
```

Build your container:

```bash
# Build with Heroku buildpacks (recommended)
pack build quick-mcp --builder heroku/builder:22

# Build with Paketo buildpacks (alternative)
pack build quick-mcp --builder paketobuildpacks/builder-jammy-base

# Build with Google Cloud buildpacks
pack build quick-mcp --builder gcr.io/buildpacks/builder:v1
```

Run the container:

```bash
# Set required environment variables
docker run -p 8080:8080 \
  -e OPENAPI_SPEC_URL="https://api.example.com/openapi.json" \
  -e PORT=8080 \
  -e NODE_ENV=production \
  quick-mcp
```

### Project Configuration

Create a `project.toml` file to configure buildpack behavior:

```toml
[project]
id = "quick-mcp"
name = "Quick-MCP Server"
version = "0.1.0"

[[project.licenses]]
type = "MIT"

[build]
include = [
  "packages/",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.json"
]

exclude = [
  "**/*.test.ts",
  "**/test/",
  "**/tests/",
  "**/.git",
  "**/node_modules",
  "**/*.md"
]

[build.env]
BP_NODE_VERSION = "20.*"
BP_PNPM_VERSION = "9.*"

[[build.buildpacks]]
uri = "heroku/nodejs"
```

### Platform-Specific Examples

#### Heroku (Native Buildpacks)

Heroku automatically detects Node.js applications and uses buildpacks by default. No special configuration needed - just deploy with:

```bash
git push heroku main
```

The buildpack will automatically:

- Detect Node.js and pnpm
- Install dependencies
- Set the start command to use `--env` flag for 12-factor configuration

#### Google Cloud Run

```bash
# Build and deploy to Cloud Run
pack build gcr.io/YOUR_PROJECT/quick-mcp --builder heroku/builder:22
docker push gcr.io/YOUR_PROJECT/quick-mcp

gcloud run deploy quick-mcp \
  --image gcr.io/YOUR_PROJECT/quick-mcp \
  --set-env-vars OPENAPI_SPEC_URL=https://api.example.com/openapi.json \
  --port 8080 \
  --allow-unauthenticated
```

#### AWS App Runner

```bash
# Build and push to ECR
pack build $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/quick-mcp \
  --builder heroku/builder:22

aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com

docker push $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/quick-mcp
```

#### Azure Container Instances

```bash
# Build and push to Azure Container Registry
pack build $ACR_NAME.azurecr.io/quick-mcp \
  --builder heroku/builder:22

az acr login --name $ACR_NAME
docker push $ACR_NAME.azurecr.io/quick-mcp

az container create \
  --resource-group $RESOURCE_GROUP \
  --name quick-mcp \
  --image $ACR_NAME.azurecr.io/quick-mcp \
  --environment-variables OPENAPI_SPEC_URL=https://api.example.com/openapi.json \
  --ports 8080
```

## 🐳 Traditional Docker (Alternative)

If you prefer using the provided Dockerfile:

```bash
# Build with Docker
docker build -t quick-mcp .

# Run with environment variables
docker run -p 8080:8080 \
  -e OPENAPI_SPEC_URL="https://api.example.com/openapi.json" \
  -e PORT=8080 \
  -e NODE_ENV=production \
  quick-mcp
```

## 📦 Container Registry Publishing

### GitHub Container Registry

```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin

# Build and push with buildpacks
pack build ghcr.io/$GITHUB_USERNAME/quick-mcp --builder heroku/builder:22 --publish

# Or build and push with Docker
docker build -t ghcr.io/$GITHUB_USERNAME/quick-mcp .
docker push ghcr.io/$GITHUB_USERNAME/quick-mcp
```

### Docker Hub

```bash
# Login to Docker Hub
docker login

# Build and push with buildpacks
pack build $DOCKERHUB_USERNAME/quick-mcp --builder heroku/builder:22 --publish

# Or build and push with Docker
docker build -t $DOCKERHUB_USERNAME/quick-mcp .
docker push $DOCKERHUB_USERNAME/quick-mcp
```

## 🔧 Environment Configuration

Quick-MCP follows 12-factor app principles and can be configured entirely through environment variables:

```bash
# Required
OPENAPI_SPEC_URL=https://api.example.com/openapi.json

# Optional
PORT=8080                    # Server port (default: 8080 in production, 3000 in development)
LOG_LEVEL=info              # Log level (trace|debug|info|warn|error|fatal)
TRANSPORT=http              # Transport type (http|stdio)
BASE_URL=https://api.com    # Override API base URL
AUTH_HEADERS='{"Authorization":"Bearer token"}' # JSON string of headers
NODE_ENV=production         # Environment mode
```

## 🚀 Deployment Examples

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: quick-mcp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: quick-mcp
  template:
    metadata:
      labels:
        app: quick-mcp
    spec:
      containers:
      - name: quick-mcp
        image: quick-mcp:latest
        ports:
        - containerPort: 8080
        env:
        - name: OPENAPI_SPEC_URL
          value: "https://api.example.com/openapi.json"
        - name: PORT
          value: "8080"
        - name: NODE_ENV
          value: "production"
```

### Docker Compose

```yaml
version: '3.8'
services:
  quick-mcp:
    build: .
    # Or use a pre-built image:
    # image: quick-mcp:latest
    ports:
      - "8080:8080"
    environment:
      - OPENAPI_SPEC_URL=https://api.example.com/openapi.json
      - PORT=8080
      - NODE_ENV=production
      - LOG_LEVEL=info
    restart: unless-stopped
```

## 📋 Best Practices

1. **Use buildpacks for production** - More secure and maintainable
2. **Set NODE_ENV=production** - Enables production optimizations
3. **Use specific tags** - Avoid `latest` in production
4. **Health checks** - Quick-MCP exposes health endpoints
5. **Resource limits** - Set appropriate CPU/memory limits
6. **Secrets management** - Use platform secret stores for AUTH_HEADERS
7. **Multi-stage builds** - If using Dockerfile, consider multi-stage for smaller images

## 🔍 Troubleshooting

- **Port binding**: Ensure your platform PORT env var matches the container port
- **Network access**: Verify the container can reach your OpenAPI spec URL
- **Memory limits**: Node.js apps may need 512MB+ RAM depending on spec size
- **TypeScript**: Uses `--experimental-strip-types` so no build step needed in container
