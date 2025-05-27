# Development Practices for Quick-MCP

This document establishes practices for sustainable development with AI coding
assistants while maintaining production code quality. It consolidates lessons
learned from the Quick-MCP codebase consolidation.

## Philosophy: Two-Phase Development

Development with AI assistants follows a mandatory two-phase process:

1. **Exploration Phase**: Rapid prototyping and feature discovery
2. **Consolidation Phase**: Manual refinement to production quality

The consolidation phase is **not optional** - it transforms AI-generated
exploration code into sustainable, production-ready software.

## Phase 1: Exploration (Vibe Mode)

### When to Use

- Initial project setup and prototyping
- Exploring new APIs, libraries, or patterns
- Generating boilerplate and scaffolding
- Rapid feature iteration

### Best Practices

```markdown
✅ DO:

- Use AI to generate initial structure quickly
- Explore multiple approaches and patterns
- Focus on getting working functionality
- Document exploration decisions for later review

❌ DON'T:

- Accept generated code as production-ready
- Skip error handling "temporarily"
- Ignore obvious code smells
- Accumulate technical debt without tracking
```

### Exploration Anti-Patterns

Based on Quick-MCP consolidation analysis:

```typescript
// EXPLORATION ANTI-PATTERN: Everything in one file
class QuickMCP {
  static async fromEnvironment() { /* Environment parsing */ }
  constructor() { /* Server + logging + validation */ }
  start() { /* HTTP + stdio + error handling */ }
  #getSafetyStats() { /* Analytics */ }
}
const program = new Command() /* CLI mixed with library */

// EXPLORATION ANTI-PATTERN: Generic names
const { spec } = await parseSpecPath(path);     // "spec" everywhere
const tools = this.#tools.filter(...);         // generic "tools"
function buildRequest(app, op, args)            // args, op generic
```

## Phase 2: Consolidation (Critical)

### Mandatory Consolidation Tasks

#### 1. **Extract Domain Abstractions**

```typescript
// Before (AI Generated - Generic)
function loadEnvironmentConfig(): EnvironmentConfig;
function parseSpec(spec: object): OpenApiSpec;
function buildRequest(app, op, args): Request;

// After (Consolidated - Domain-Specific)
class QuickMcpConfiguration {
  static fromEnvironment(): QuickMcpConfiguration;
  static fromCliArgs(): QuickMcpConfiguration;
  validate(): ConfigurationValidationResult;
  toServerOptions(): ServerOptions;
}

class OpenApiSpecificationProcessor {
  static parseFromUrl(url: string): Promise<ProcessedSpecification>;
  validateSpecification(): SpecificationValidationResult;
}

class McpHttpRequestBuilder {
  buildFromOperation(operation: QuickMcpOperation, args: McpArguments): Request;
}
```

#### 2. **Eliminate Production Risk Patterns**

```typescript
// BEFORE: Console statements in library code
catch (error) {
  console.warn('Failed to parse AUTH_HEADERS:', error);
  // Continues with empty authHeaders - silent failure
}

this.#log.error(`Failed to start server: ${errorMessage}`);
process.exit(1); // Process termination in library code

// AFTER: Proper error handling
catch (error) {
  if (error instanceof JsonParseError) {
    throw new ConfigurationError(
      'Invalid AUTH_HEADERS format: must be valid JSON',
      { cause: error, context: { headers: rawHeaders } }
    );
  }
  throw new UnexpectedError('Configuration parsing failed', { cause: error });
}

// Throw errors instead of process.exit
throw new ServerStartupError(
  'Failed to start Quick-MCP server',
  { cause: error, port, transport }
);
```

#### 3. **Write Comprehensive Tests**

```typescript
// Not just happy path - test edge cases AI might miss
describe('Production Edge Cases', () => {
  describe('OpenAPI Spec Handling', () => {
    it('fails gracefully with empty spec', async () => {
      // Test: empty file, network timeout, 404 responses
    });

    it('handles circular $ref loops', async () => {
      // Test: prevents infinite recursion, gives helpful error
    });

    it('respects memory limits', async () => {
      // Test: large specs don't crash process
    });
  });

  describe('Network Resilience', () => {
    it('retries on network timeouts', async () => {
      // Test: exponential backoff, max retries
    });

    it('handles DNS failures gracefully', async () => {
      // Test: helpful error messages, no crashes
    });
  });

  describe('Authentication Edge Cases', () => {
    it('validates AUTH_HEADERS JSON', async () => {
      // Test: malformed JSON gives helpful error
    });

    it('handles expired/invalid tokens', async () => {
      // Test: 401/403 responses handled gracefully
    });
  });
});
```

#### 4. **Document Design Decisions**

```typescript
/**
 * Processes OpenAPI specifications for MCP tool generation.
 *
 * Design decisions:
 * - Uses streaming parser to handle large specs (>100 operations)
 * - Fails fast on circular references to prevent infinite loops
 * - Classifies operations by safety (readonly, update, delete)
 * - Supports x-quick-mcp extensions for custom behavior
 *
 * @example
 * const processor = new OpenApiSpecProcessor({ maxOperations: 500 });
 * const spec = await processor.parseFromUrl('https://api.example.com/openapi.json');
 */
```

## Consolidation Checklist

Before considering any AI-assisted development complete:

### Code Quality

- [ ] No functions longer than 50 lines
- [ ] All functions have explicit return types
- [ ] No `any` types or type escape hatches
- [ ] Error handling covers all failure modes
- [ ] Domain-specific abstractions extracted
- [ ] No console.log/warn in library code
- [ ] No process.exit() in library code

### Testing

- [ ] > 70% test coverage with meaningful tests
- [ ] Edge cases and error conditions tested
- [ ] Integration tests for key workflows
- [ ] Performance boundaries tested
- [ ] Resource cleanup tested

### Documentation

- [ ] Design decisions documented with rationale
- [ ] Public API documented with examples
- [ ] Architecture patterns explained
- [ ] Troubleshooting guides provided

### Production Readiness

- [ ] Proper error boundaries with context
- [ ] Resource limits and timeouts configured
- [ ] Logging with appropriate levels
- [ ] Health checks and monitoring hooks
- [ ] Graceful shutdown handling

## Quick-MCP Specific Patterns

### Identified Vibe Smells

From consolidation analysis of Quick-MCP codebase:

#### **🚨 Critical: Large Files (>200 lines)**

- `main.ts` (389 lines) - Mixed CLI + library + config concerns
- `openapi.ts` (390 lines) - Parsing + registration + validation + querying
- `request-builder.ts` (195 lines) - URL + headers + body building mixed

#### **🚨 Production Risk: Error Handling**

- Silent failures with console.warn then continue
- Generic Error instances without context
- Process termination instead of throwing errors
- No user-friendly error messages

#### **🚨 Missing Critical Features**

- Transport layer completely untested (0% coverage)
- No timeout handling for HTTP requests
- No retry logic for network failures
- No input validation for user data
- No graceful shutdown handling

### Consolidation Success Metrics

Specific to Quick-MCP transformation:

- [ ] All files under 200 lines
- [ ] Transport layer >80% test coverage
- [ ] All error paths return meaningful errors
- [ ] No console.\* statements in library code
- [ ] CLI separated from library concerns
- [ ] Configuration validation with helpful messages
- [ ] Network requests have timeouts and retries

## Working with AI: Session Boundaries

### Starting a Session

```markdown
"I need to add feature X to Quick-MCP. Let's start with exploration/prototyping.
Context: This is a proof-of-concept OpenAPI-to-MCP converter that needs
production hardening."
```

### Ending a Session

```markdown
"Now let's consolidate this exploration code. Help me:

1. Extract domain-specific abstractions
2. Add comprehensive error handling with context
3. Write tests for edge cases and failure modes
4. Document design decisions and trade-offs
5. Ensure no production risk patterns remain"
```

### Progressive Enhancement Approach

```markdown
Iteration 1: "Get it working" (Exploration) Iteration 2: "Make it robust" (Error
handling, edge cases) Iteration 3: "Make it clean" (Abstractions, naming)
Iteration 4: "Make it observable" (Logging, monitoring)
```

## Red Flags Requiring Immediate Consolidation

### 🚨 Code Smells

- Functions longer than 50 lines
- Files longer than 200 lines
- Mixed concerns in single function/class
- Generic variable names (`data`, `item`, `config`, `args`)
- Type escape hatches (`as any`, `@ts-ignore`)

### 🚨 Production Risks

- Console statements in library code
- Process termination instead of error throwing
- Silent failure patterns (catch and continue)
- No input validation
- No resource cleanup or timeout handling

### 🚨 Test Gaps

- Only happy path coverage
- No edge case or error condition tests
- Transport layers untested
- No integration tests
- No performance boundary tests

## Success Indicators

### Code Quality Metrics

- **File Size**: All files under 200 lines
- **Function Size**: All functions under 50 lines
- **Type Safety**: Zero `any` types in production code
- **Error Handling**: All failure modes addressed with context
- **Abstraction Level**: Domain concepts clearly represented

### Process Indicators

- **Time Split**: 30% exploration, 70% consolidation
- **Review Cycles**: At least 2 consolidation passes
- **Test Quality**: Tests written with production mindset
- **Documentation**: Design decisions captured, not just implementation

## Integration with Standard Practices

This document is designed to work alongside:

- `CONTRIBUTING.md` - General contribution guidelines
- `ARCHITECTURE.md` - System design and patterns
- `TESTING.md` - Testing philosophy and requirements
- `TODO.md` - Active work tracking

For teams using Windsurf, these practices can be converted to rules using the
prompt template in NEXT_STEPS.md.

## Summary

AI-assisted development is powerful but requires discipline:

1. **Exploration is just the beginning** - Never ship exploration code directly
2. **Consolidation is mandatory** - It transforms prototypes into production
   software
3. **Use domain expertise** - AI generates generic code; humans make it
   domain-specific
4. **Test with production mindset** - Real edge cases, not just happy paths
5. **Document the journey** - Capture design decisions and trade-offs

The goal isn't to code faster, but to reach production quality faster through
systematic consolidation of AI-generated exploration work.

---

_This document incorporates lessons learned from the Quick-MCP consolidation
process and should be updated as new patterns emerge._
