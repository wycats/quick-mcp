# TODO - Active Work Items

**Status**: This is the single source of truth for active development tasks in
Quick-MCP.

> **Note**: This consolidates work items from NEXT_STEPS.md, plan/, and other
> fragmented TODO documents into a prioritized action list.

## Phase 1: Documentation Reality Check ✅ COMPLETED

- [x] Create honest README.md reflecting actual capabilities
- [x] Consolidate DEVELOPMENT_PRACTICES.md from CONSOLIDATION.md and
      VIBE_CODING_PRACTICES.md
- [x] Create comprehensive CONTRIBUTING.md from Windsurf rules
- [x] Document system architecture in ARCHITECTURE.md
- [x] Archive outdated aspirational documentation
- [x] Create single source TODO.md (this file)

## Phase 2: Code Consolidation 🔄 IN PROGRESS

### Critical Fixes (P0)

- [ ] **Fix MCP compliance**: Use `Tool.annotations.x-ai` instead of metadata
      field
- [ ] **Fix test scripts**: Remove duplicate `--run` flag causing test failures
- [ ] **Validate against MCP schema**: Ensure responses match official MCP
      `schema.ts`

### Type Safety & Error Handling (P1)

- [ ] **Complete branding migration**: Convert remaining `string` types to
      branded types
  - Port validation in config
  - URL validation in OpenAPI loader
  - Operation IDs and schema names
- [ ] **Add request timeouts**: Prevent hanging HTTP requests to APIs
- [ ] **Implement proper error hierarchy**:

  ```typescript
  // Target structure from ARCHITECTURE.md
  BaseError
    ├── ConfigurationError
    ├── OpenApiError
    ├── TransportError
    └── ServerError
  ```

### Transport Layer (P1)

- [ ] **Test stdio transport**: Currently only HTTP transport is tested
- [ ] **Add connection pooling**: For better performance with multiple API calls
- [ ] **Implement retry logic**: For transient failures

## Phase 3: Testing & Quality 📋 PLANNED

### Test Coverage (P1)

- [ ] **Achieve >70% test coverage**: Current coverage unknown
- [ ] **Add integration tests**: End-to-end MCP protocol testing
- [ ] **Add error case testing**: Network failures, invalid schemas, auth
      failures

### Code Quality (P2)

- [ ] **Run lint checks**: Fix any remaining ESLint violations
- [ ] **Add performance benchmarks**: Measure conversion and response times
- [ ] **Security audit**: Review auth forwarding and validation

## Phase 4: Production Readiness 🚀 FUTURE

### Packaging (P2)

- [ ] **Create npm package**: `@quick-mcp/core` with proper exports
- [ ] **Set up GitHub repository**: Public repo with CI/CD pipeline
- [ ] **Add Docker support**: Production-ready container setup

### Documentation (P2)

- [ ] **Write deployment guides**: Docker, environment config, monitoring
- [ ] **Create API documentation**: Public API reference
- [ ] **Add tutorial content**: Getting started guides

### Advanced Features (P3)

- [ ] **Overlay system**: External metadata without modifying OpenAPI specs
- [ ] **Watch mode**: `quick-mcp dev --watch` with hot reload
- [ ] **Web UI**: Browser-based tool explorer and debugger

## Work In Progress

Currently focusing on Phase 2 critical fixes to make the codebase
production-ready.

## Completed Archive

Moved to `.archive/` directory:

- Multiple Windsurf rule files (consolidated into CONTRIBUTING.md)
- CONSOLIDATION.md and VIBE_CODING_PRACTICES.md (merged into
  DEVELOPMENT_PRACTICES.md)
- Aspirational deployment docs (HEROKU.md, CONTAINERIZATION.md)
- Fragmented analysis documents (REFACTORING_TODO.md, CODING_STYLE.md)

## Notes

- **Priority Levels**: P0 (critical/broken), P1 (important), P2 (improvement),
  P3 (nice-to-have)
- **Status Tracking**: Use GitHub issues once repository is public
- **Dependencies**: Phase 2 must complete before Phase 3 testing can be
  effective
