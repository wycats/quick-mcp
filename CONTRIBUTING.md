# Contributing to Quick-MCP

Thank you for contributing to Quick-MCP! This guide provides development
standards and practices for maintaining high-quality, production-ready code.

## Quick Start

### Development Setup

```bash
# Prerequisites: Node.js 18+, pnpm
git clone <repository-url>
cd quick-mcp
pnpm install

# Run tests
pnpm test

# Start demo environment
pnpm dev:demo                # Terminal 1: Demo API
# Terminal 2: Quick-MCP
pnpm dev --spec http://localhost:3001/api-docs.json --port 8080 --transport http
```

### Before Contributing

- [ ] Read [DEVELOPMENT_PRACTICES.md](DEVELOPMENT_PRACTICES.md) for AI-assisted
      development workflows
- [ ] Ensure all tests pass: `pnpm test`
- [ ] Check code quality: `pnpm lint:strict`
- [ ] Build successfully: `pnpm build`

## Code Standards

### TypeScript Requirements

```typescript
// ✅ DO: Explicit types and private fields
export class OpenApiSpecProcessor {
  readonly #cache: Map<string, ProcessedSpec> = new Map();

  async parseSpec(url: SpecUrl): Promise<ProcessedSpec> {
    // Implementation
  }
}

// ❌ DON'T: Any types or public fields
export class BadProcessor {
  cache: any; // Never use 'any'

  parseSpec(url: any): any {
    // Missing type safety
  }
}
```

### Quality Standards

- **Type Safety**: Zero `any` types, explicit return types for all functions
- **Error Handling**: Domain-specific errors with context, no console.\* in
  library code
- **Function Size**: Maximum 50 lines per function
- **File Size**: Maximum 200 lines per file
- **Naming**: Domain-specific names over generic (`McpOperation` not
  `operation`)

### Code Organization

```typescript
// Preferred structure
packages/core/src/
├── domain/           # Business logic
├── infrastructure/   # External concerns
├── application/      # Use cases
└── presentation/     # API interfaces
```

## Testing Philosophy

### No-Mocks Policy

Use factory functions and real implementations with controlled inputs:

```typescript
// ✅ DO: Factory functions
import { createTestOperation } from '../test/factories';

describe('OperationProcessor', () => {
  it('processes valid operations', () => {
    const operation = createTestOperation({ method: 'GET', path: '/users' });
    const result = processor.process(operation);
    expect(result.isResource).toBe(true);
  });
});

// ❌ DON'T: Mocks
const mockOperation = {
  method: jest.fn().mockReturnValue('GET'),
  // ... complex mock setup
};
```

### Test Organization

- **Co-located tests**: `*.test.ts` next to source files
- **Integration tests**: Separate `tests/` package
- **Custom matchers**: Use MCP-specific test utilities
- **Coverage target**: >70% with meaningful edge cases

### Test Quality

```typescript
describe('OpenApiSpecProcessor', () => {
  // Test happy path
  it('processes valid OpenAPI specs', async () => {
    // Test implementation
  });

  // Test edge cases (critical for AI-generated code)
  it('handles malformed specs gracefully', async () => {
    const invalidSpec = createMalformedSpec();
    await expect(processor.parse(invalidSpec)).rejects.toThrow(
      SpecValidationError,
    );
  });

  // Test resource limits
  it('respects memory limits with large specs', async () => {
    const largeSpec = createLargeSpec({ operations: 1000 });
    const result = await processor.parse(largeSpec);
    expect(result.operationCount).toBeLessThanOrEqual(500);
  });
});
```

## Architecture Guidelines

### Core Design Principles

1. **Domain-Driven Design**: Clear separation between business logic and
   infrastructure
2. **Functional Core, Imperative Shell**: Pure functions at the core, side
   effects at boundaries
3. **Explicit Dependencies**: Constructor injection, no hidden globals
4. **Fail Fast**: Validate inputs at boundaries, throw meaningful errors

### Component Responsibilities

```typescript
// OpenAPI parsing and validation
class OpenApiSpecProcessor {
  static async parseFromUrl(url: SpecUrl): Promise<ProcessedSpec>;
  validateSpec(): ValidationResult;
}

// MCP tool generation
class McpToolGenerator {
  generateTools(spec: ProcessedSpec): ReadonlyArray<McpTool>;
  generateResources(spec: ProcessedSpec): ReadonlyArray<McpResource>;
}

// HTTP request handling
class HttpRequestBuilder {
  buildRequest(operation: Operation, args: ToolArgs): Request;
}
```

### Extension System

Support `x-quick-mcp` extensions in OpenAPI specs:

```yaml
# OpenAPI spec with Quick-MCP extensions
paths:
  /users:
    get:
      x-quick-mcp:
        operationId: 'list_users'
        ignore: false
        annotations:
          readOnlyHint: true
```

## Pull Request Process

### Pre-submission Checklist

- [ ] All tests pass (`pnpm test`)
- [ ] Code passes strict linting (`pnpm lint:strict`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Changes are covered by tests (aim for >70% coverage)
- [ ] Documentation updated for API changes
- [ ] Follows consolidation practices from DEVELOPMENT_PRACTICES.md

### Commit Standards

Use Conventional Commits format:

```bash
feat(core): add timeout handling for HTTP requests
fix(parser): handle circular references in OpenAPI specs
docs(readme): update installation instructions
test(transport): add integration tests for stdio transport
```

### PR Quality

- **Single Purpose**: One feature or fix per PR
- **Clear Description**: What changed and why
- **Breaking Changes**: Document any API changes
- **Performance Impact**: Note any performance implications
- **Documentation Standards**: Follow qualitative descriptions in user-facing docs

#### Documentation in PRs

**User-Facing Documentation (README, guides):**
```markdown
✅ DO: "Comprehensive testing with strong coverage"
❌ DON'T: "64.31% test coverage with 227 passing tests"

✅ DO: "Production-ready error handling"
❌ DON'T: "100% error module coverage"

✅ DO: "Well-tested and type-safe codebase"
❌ DON'T: "Zero TypeScript errors"
```

**Development Documentation (CONTRIBUTING, internal):**
```markdown
✅ DO: "Maintain >70% coverage"
✅ DO: "All 227 tests must pass"
✅ DO: "Zero TypeScript errors required"
```

**Rationale**: User-facing docs should focus on capabilities and quality, while development docs provide specific targets for contributors.

## Development Workflow

### Two-Phase Development

This project follows a structured development approach:

1. **Exploration Phase**: Rapid prototyping and feature discovery
2. **Consolidation Phase**: Refinement to production quality

See [DEVELOPMENT_PRACTICES.md](DEVELOPMENT_PRACTICES.md) for detailed
AI-assisted development practices.

### Scope Management

- **Stay Focused**: Address the specific issue or feature
- **Ask Questions**: Clarify requirements before starting large changes
- **Break Down Work**: Large features should be implemented incrementally

### Dependency Management

- **Prefer Existing**: Use libraries already in the project
- **Justify New Dependencies**: Document why new packages are needed
- **Security First**: Audit new dependencies for vulnerabilities

## Working with AI Assistants

Quick-MCP is designed to work well with AI coding assistants. Key practices:

### Session Boundaries

- **Start with Context**: Share the current issue and codebase state
- **End with Consolidation**: Review and refine AI-generated code
- **Document Decisions**: Capture design rationales and trade-offs

### Quality Gates

Before considering AI-assisted changes complete:

- [ ] Extract meaningful abstractions
- [ ] Add comprehensive error handling
- [ ] Write tests for edge cases
- [ ] Document design decisions
- [ ] Ensure production readiness

See [DEVELOPMENT_PRACTICES.md](DEVELOPMENT_PRACTICES.md) for complete AI
development workflows.

## Common Patterns

### Factory Methods

Preferred for object construction:

```typescript
// ✅ DO: Factory methods with validation
class SpecUrl {
  private constructor(private readonly value: string) {}

  static fromString(url: string): SpecUrl {
    if (!URL.canParse(url)) {
      throw new ValidationError(`Invalid URL: ${url}`);
    }
    return new SpecUrl(url);
  }
}

// ❌ DON'T: Direct constructors
class BadSpecUrl {
  constructor(public url: string) {} // No validation
}
```

### Error Handling

Use domain-specific errors with context:

```typescript
// ✅ DO: Contextual errors
try {
  const spec = await this.fetchSpec(url);
} catch (error) {
  throw new SpecFetchError(`Failed to load OpenAPI spec from ${url}`, {
    cause: error,
    url,
    retryCount: this.retryCount,
  });
}

// ❌ DON'T: Generic errors or console statements
try {
  const spec = await this.fetchSpec(url);
} catch (error) {
  console.error('Spec fetch failed:', error); // Never in library code
  throw error; // Missing context
}
```

### Async Patterns

Use proper async/await with error boundaries:

```typescript
// ✅ DO: Explicit timeout and error handling
async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new HttpError(`HTTP ${response.status}`, {
        status: response.status,
      });
    }
    return response;
  } finally {
    clearTimeout(timeout);
  }
}
```

## Security and Performance

### Input Validation

Validate all external inputs:

```typescript
function validatePort(port: unknown): Port {
  if (typeof port !== 'number' || !Number.isInteger(port)) {
    throw new ValidationError('Port must be an integer');
  }
  if (port < 1 || port > 65535) {
    throw new ValidationError('Port must be between 1 and 65535');
  }
  return port as Port;
}
```

### Memory Management

Handle large inputs gracefully:

```typescript
async function parseSpec(spec: object): Promise<ProcessedSpec> {
  // Validate size before processing
  const specSize = JSON.stringify(spec).length;
  if (specSize > MAX_SPEC_SIZE) {
    throw new SpecTooLargeError(
      `Spec size ${specSize} exceeds limit ${MAX_SPEC_SIZE}`,
    );
  }

  // Stream processing for large specs
  return this.streamingParser.parse(spec);
}
```

## Getting Help

- **Issues**: Check existing issues before creating new ones
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: See `docs/` for architecture and examples
- **Development**: Reference DEVELOPMENT_PRACTICES.md for AI workflows

## License

By contributing, you agree that your contributions will be licensed under the
MIT License.
