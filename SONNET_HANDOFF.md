# SONNET_HANDOFF.md

## Current State

Quick-MCP is in the final stages of migration but has critical P0 issues that block release:

- **MCP compliance failures**: Tool calls are broken due to incorrect schema transformation
- **Test coverage drop**: Coverage decreased from 93% to 81% after recent changes
- **Architecture concerns**: Opus review identified coupling issues in the test package

## Critical Tasks (Priority Order)

### 1. Fix MCP Tool Call Schema Compliance (P0 - BLOCKING)

**Problem**: OpenAPI schemas are not being correctly transformed to MCP-compatible JSON schemas, causing tool calls to fail.

**Files to examine**:

- `/home/ykatz/Code/quick-mcp/packages/core/src/openapi.ts` - Schema transformation logic
- `/home/ykatz/Code/quick-mcp/packages/core/src/schema/openapi-to-jsonschema.ts` - Conversion implementation
- `/home/ykatz/Code/quick-mcp/tests/src/resource-advanced.test.ts` - Failing test case

**Verification commands**:

```bash
# Run the specific failing test
pnpm vitest tests/src/resource-advanced.test.ts -t "converts operations with request bodies to tools"

# Check all MCP compliance tests
pnpm test -- --grep "MCP"
```

**Success criteria**:

- All tests in `resource-advanced.test.ts` pass
- Tool schemas include proper `inputSchema` wrapping
- No `additionalProperties: false` at wrong nesting levels

### 2. Restore Test Coverage to 90%+ (P0)

**Problem**: Coverage dropped from 93% to 81%, indicating untested code paths.

**Files to examine**:

- Coverage report: Run `pnpm test:coverage` and check `coverage/lcov-report/index.html`
- `/home/ykatz/Code/quick-mcp/packages/core/src/transport/index.ts` - New transport code
- `/home/ykatz/Code/quick-mcp/packages/test/src/` - New test package lacking coverage

**Verification commands**:

```bash
# Generate coverage report
pnpm test:coverage

# Check specific package coverage
pnpm vitest packages/core --coverage

# Find untested files
find packages -name "*.ts" -not -name "*.test.ts" -not -name "*.d.ts" | xargs grep -L "test"
```

**Success criteria**:

- Overall coverage ≥ 90%
- No critical paths with < 80% coverage
- All new code in transport layer has tests

### 3. Fix Test Package Architecture Issues (P1)

**Problem**: Opus review identified tight coupling and missing abstractions in the test package.

**Files to examine**:

- `/home/ykatz/Code/quick-mcp/packages/test/OPUS_ARCHITECTURAL_REVIEW.md` - Full review
- `/home/ykatz/Code/quick-mcp/packages/test/src/llm-runner.ts` - Needs provider abstraction
- `/home/ykatz/Code/quick-mcp/packages/test/src/mcp-client.ts` - Needs interface extraction

**Verification commands**:

```bash
# Check for interface definitions
grep -r "interface" packages/test/src/

# Run test package tests
pnpm test packages/test

# Verify provider abstraction works
pnpm quick-mcp-test verify-provider claude-3-opus-20240229
```

**Success criteria**:

- Extract `ILLMProvider` interface
- Create `IMCPClient` interface
- Provider-specific code isolated to adapters
- Tests still pass after refactoring

### 4. Complete ESLint Rule Documentation (P1)

**Problem**: Custom ESLint rules lack proper documentation and examples.

**Files to examine**:

- `/home/ykatz/Code/quick-mcp/eslint-rules/README.md` - Needs completion
- `/home/ykatz/Code/quick-mcp/eslint-rules/index.js` - Rule implementations
- `/home/ykatz/Code/quick-mcp/eslint-rules/TESTING.md` - Testing guide needs work

**Verification commands**:

```bash
# Run ESLint with custom rules
pnpm lint

# Test ESLint rules
pnpm test eslint-rules

# Check rule coverage
grep -A5 "meta:" eslint-rules/index.js
```

**Success criteria**:

- Each rule has documentation with examples
- Testing guide shows how to add new rules
- All rules have corresponding tests

### 5. Validate Heroku Deployment Configuration (P2)

**Problem**: Need to ensure one-click deployment works correctly.

**Files to examine**:

- `/home/ykatz/Code/quick-mcp/app.json` - Heroku app configuration
- `/home/ykatz/Code/quick-mcp/Procfile` - Process types
- `/home/ykatz/Code/quick-mcp/packages/core/src/transport/http.ts` - HTTP transport

**Verification commands**:

```bash
# Validate app.json
cat app.json | jq .

# Test local Heroku simulation
PORT=5000 pnpm start:core

# Check environment variable usage
grep -r "process.env" packages/core/src/
```

**Success criteria**:

- `app.json` has all required fields
- Environment variables documented
- HTTP transport works on dynamic port
- Deploy button in README works

## Quick Start Commands

```bash
# 1. Check current test failures
pnpm test

# 2. Focus on the specific failing test
pnpm vitest tests/src/resource-advanced.test.ts --reporter=verbose

# 3. Check coverage gaps
pnpm test:coverage
open coverage/lcov-report/index.html

# 4. Run lint to check code quality
pnpm lint

# 5. Start the demo environment for manual testing
pnpm demo:test
```

## Key Decision Points

1. **Schema transformation**: The core issue is in `openapi-to-jsonschema.ts` - the MCP expects `inputSchema` wrapping that we're not providing
2. **Test coverage**: Focus on transport layer and new test package - these are the main gaps
3. **Architecture**: Start with interface extraction before moving code - less risky
4. **Deployment**: Test with actual Heroku deployment, not just local simulation

## Resources

- MCP Specification: <https://modelcontextprotocol.io/docs/specification>
- OpenAPI to JSON Schema rules: <https://swagger.io/docs/specification/data-models/>
- Vitest docs for debugging: <https://vitest.dev/guide/debugging.html>
