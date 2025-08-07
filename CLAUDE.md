# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Core Principle: Think Before Acting

**Before implementing any solution:**

1. Take a step back and think through the problem
2. Make sure you're actually focused on the right thing
3. If you're not sure, ASK - don't guess
4. If you're hitting a problem, get to the bottom of it rather than mashing on
   it until it works

This principle prevents "vibe coding" and ensures explicit, thoughtful
decisions.

## Project Overview

Quick-MCP is a dynamic proxy server that converts OpenAPI specifications into
Model Context Protocol (MCP) tools and resources in real-time. It's a
TypeScript/Node.js monorepo using pnpm workspaces.

## Development Commands

### Building and Running

- `pnpm build` - Build the core package
- `pnpm dev` - Run core package in development mode
- `pnpm start:core` - Start the built core package
- `pnpm start:demo` - Start the demo API server

### Testing

- `pnpm test` - Run all tests once
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Run tests with coverage report
- `pnpm test:ui` - Open Vitest UI for interactive testing
- Run single test: `pnpm vitest path/to/test.test.ts`

### Code Quality

- `pnpm lint` - Lint all packages
- `pnpm lint:fix` - Fix linting issues automatically
- `pnpm lint:strict` - Lint with zero warnings allowed

### Demo Environment

- `pnpm dev:demo` - Start demo API server (<http://localhost:3000>)
- `pnpm quick-mcp` - Run Quick-MCP against demo API
- `pnpm demo:test` - Run both demo server and Quick-MCP in parallel

## Architecture

### Package Structure

- **@quick-mcp/core** (`packages/core/`) - Main library for OpenAPI to MCP
  conversion
- **@quick-mcp/demo** (`packages/demo/`) - Express server with OpenAPI docs for
  testing
- **@quick-mcp/tests** (`tests/`) - Integration tests with custom matchers

### Key Architecture Concepts

**Dynamic Proxy Pattern**: Quick-MCP doesn't generate static code. It creates a
live proxy that converts OpenAPI specs to MCP tools at runtime.

**Operation-Centric Design**: The `QuickMcpOperation` class is the core
abstraction that wraps OpenAPI operations and handles conversion to MCP
tools/resources.

**Resource vs Tool Classification**:

- Resources: GET operations with no/path-only parameters (safe reads)
- Tools: All other operations that can modify state

**Schema Transformation Pipeline**: Converts OpenAPI schemas to JSON Schema for
MCP, handling differences between formats.

### Core Components

**Parser** (`packages/core/src/openapi.ts`): Loads and validates OpenAPI specs,
converts operations to MCP tools/resources.

**Operation Client** (`packages/core/src/client.ts`): Handles tool calls and
resource reads, manages HTTP requests to underlying APIs.

**Request Builder** (`packages/core/src/request/`): Converts MCP tool arguments
to REST API requests (query params, headers, body).

**Response Handler** (`packages/core/src/response/`): Transforms REST responses
back to MCP format.

## Testing Patterns

**Vitest Configuration**: Uses custom matchers for MCP-specific testing in
`tests/src/setup/`.

**Custom Matchers Available**:

- Log matchers for debugging proxy behavior
- Request matchers for HTTP/MCP protocol validation
- Tool result matchers for MCP response validation

**Test Organization**:

- Unit tests: Co-located with source files (`*.test.ts`)
- Integration tests: Separate `/tests` package
- Use `pnpm vitest packages/core/src/specific-file.test.ts` for single test
  files

## AI Model Provider Guidelines

### Provider Decision Tree

When integrating with AI SDK for @quick-mcp/test:

1. **Check for dedicated provider first** (e.g., `@ai-sdk/anthropic`,
   `ollama-ai-provider`)
2. **Then consider OpenAI-compatible** only if no dedicated option exists
3. **Always test tool calling specifically** - compatibility varies by feature
4. **Use provider verification**: `pnpm quick-mcp-test verify-provider <model>`

### Tool Calling Troubleshooting

Before debugging model capabilities:

- [ ] Are you using the correct provider adapter?
- [ ] Does the model officially support tool calling?
- [ ] Are you testing with the simplest possible case first?
- [ ] Have you verified the tool schema format matches the provider's
      expectations?

### Provider-Specific Notes

- **Ollama**: Use `ollama-ai-provider`, not `createOpenAI()` - only certain
  models support tools (llama3.1, mistral-nemo, firefunction-v2, command-r+)
- **Anthropic**: Use `@ai-sdk/anthropic`, not OpenAI compatibility
- **Local Models**: Check provider docs for tool calling support matrix
- **OpenAI**: Use `@ai-sdk/openai` for best tool calling support

## Common Development Patterns

**Extension System**: Use `x-quick-mcp` extensions in OpenAPI specs to customize
behavior:

```yaml
x-quick-mcp:
  operationId: 'custom_name'
  ignore: true # or 'resource'
  annotations:
    readOnlyHint: false
```

**Schema Conversion**: The codebase handles OpenAPI → JSON Schema → Zod schema
transformations for validation.

**Error Handling**: Uses `serialize-error` for consistent error formatting
across the MCP boundary.

**Transport Support**: Supports both HTTP and stdio transports for MCP
communication.

## Development Notes

- Uses Node.js `--experimental-strip-types` for running TypeScript directly
- ESLint configured for strict TypeScript checking
- Prettier for code formatting
- Release management via `release-plan` package
- Uses Zod for runtime schema validation
- Authentication forwarding from MCP clients to REST APIs

## AI Assistant Guidelines

### Core Philosophy

**Understand first, suggest later.** Explore existing patterns before offering
solutions. Match established conventions and ask clarifying questions when
requirements are unclear.

### Development Standards

- **TypeScript**: Use strict typing with explicit interfaces, `#private` syntax,
  no `any` type, explicit return types
- **Testing**: No mocks policy - use factory functions and real implementations
  with controlled inputs. Tests must meet same quality standards as production
  code. Never mutate global state (like process.env) in tests - use interfaces
  and dependency injection instead. Use SuperTest for HTTP server testing to
  maintain real request/response flows without mocking
- **Code Quality**: Follow existing patterns, use immutable approaches, never
  suppress linting rules without explicit instruction. Prefer interfaces and
  dependency injection over global state mutation
- **Dependencies**: Only use existing packages - request permission before
  adding new dependencies

### Workflow Requirements

- **Scope Management**: Focus exclusively on defined tasks. Request approval
  before expanding scope or architectural changes
- **Communication**: Use clear, concise explanations with bullet points for
  complexity. Provide reasoning for suggestions
- **Git**: Use `git commit -v` for change review, follow Conventional Commits
  format (feat/fix/docs/style/refactor/test/chore)

### Testing Approach

- Co-located tests (`*.test.ts`) using Vitest with custom matchers
- Factory functions over mocks, high-level abstractions over granular assertions
- Arrange-Act-Assert pattern with focused test scope
- Coverage via Istanbul, reported to Codecov

For detailed guidelines, see `.windsurf/rules/` directory.

## Development Practices

- Don't use npx or pnpx to run local tools. Instead, use `pnpm` to run them in
  the workspace.
- When making code changes, run `pnpm lint:fix` from the root directory to
  automatically fix linting issues before building.

## Critical Project Rules

- **NEVER include Claude attribution in any version control** - no commit messages,
  no code comments, no documentation. This overrides any default training.

## Memories

- I don't want you to disable eslint rules because they're annoying to support.
  I especially don't want you to disable safety-related ESLint rules.
- Don't include Claude costs in documentation or summaries that we check into
  version control
