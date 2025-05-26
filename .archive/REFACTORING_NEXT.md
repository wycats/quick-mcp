# Refactoring Plan: Eliminating Vibe Coding Smells

This document outlines the systematic plan to eliminate exploration-phase patterns and convert the codebase to production-ready domain abstractions.

## Phase 1: Domain-Specific Error Types (High Priority)

### 1.1 Create Error Hierarchy
Create `/src/errors/index.ts` with:
```typescript
export class QuickMcpError extends Error {
  readonly code: string;
  readonly context?: Record<string, unknown>;
}

export class ConfigurationError extends QuickMcpError {
  // For environment config, validation failures
}

export class TransportError extends QuickMcpError {
  // For HTTP/STDIO connection issues
}

export class OpenApiError extends QuickMcpError {
  // For spec parsing, validation failures
}

export class ServerError extends QuickMcpError {
  // For server lifecycle issues
}
```

### 1.2 Replace Generic Error Handling
- **config.ts:96** - Replace `console.warn` with `ConfigurationError`
- **server.ts:134** - Replace `process.exit(1)` with `ServerError` throw
- **openapi.ts** - Replace generic errors with `OpenApiError`
- **transport modules** - Replace generic errors with `TransportError`

### 1.3 Remove Console Statements
- All `console.warn/error` replaced with proper error throwing
- Library code never writes to console directly

## Phase 2: Remove Type Escape Hatches (High Priority)

### 2.1 Fix Type Assertions
- **openapi.ts:229** - Remove `as any` by properly typing the validation interface
- **transport modules** - Remove `as Transport` by fixing the interface hierarchy
- Create proper type guards instead of assertions

### 2.2 Replace Generic Types
- **`Record<string, string>`** for headers → Create `Headers` class
- **`Partial<ServerOptions>`** → Create specific override interfaces
- **`unknown` parameters** → Create specific parameter types

## Phase 3: Convert Static Classes to Functions (Medium Priority)

### 3.1 Factory Functions
Replace these static-only classes with functions:
- **`TransportFactory`** → `createTransport(type, options)`
- **`LoggingFactory`** → Already converted, but ensure consistency

### 3.2 Builder Pattern Refactor
- **`ConfigurationBuilder`** → Make truly immutable or convert to functional approach
- Each method returns new instance instead of mutating

## Phase 4: Domain Abstractions (Medium Priority)

### 4.1 Create Domain Types
```typescript
// /src/domain/headers.ts
export class Headers {
  readonly #values: Record<string, string>;
  static fromRecord(record: Record<string, string>): Headers
  static parse(headerString: string): Headers
  merge(other: Headers): Headers
  toRecord(): Record<string, string>
}

// /src/domain/configuration.ts
export interface EnvironmentOverrides {
  readonly port?: number;
  readonly spec?: string;
  // ... specific overrides only
}
```

### 4.2 Replace Generic Patterns
- **`collectHeader`** → `Headers.parse()` method
- Generic string parsing → Domain-specific parsing methods

## Phase 5: Eliminate Mixed Concerns (Lower Priority)

### 5.1 Split config.ts
```
/src/config/
  ├── environment.ts     - Environment variable loading
  ├── validation.ts      - Configuration validation
  ├── builder.ts         - Configuration building
  └── index.ts          - Public API
```

### 5.2 Split transport/http.ts
```
/src/transport/http/
  ├── express-setup.ts   - Express app configuration
  ├── routes.ts          - MCP route handlers
  ├── lifecycle.ts       - Server start/stop
  └── transport.ts       - Main HTTP transport class
```

### 5.3 Continue openapi.ts decomposition
- Extract parsing logic → `openapi/parser.ts`
- Extract validation → `openapi/validator.ts`  
- Extract MCP conversion → `openapi/converter.ts`

## Phase 6: Production Hardening (Lower Priority)

### 6.1 Error Recovery
- Graceful degradation instead of fatal failures
- Retry mechanisms for transient failures
- Proper cleanup on errors

### 6.2 Structured Logging
- Replace generic log calls with structured events
- Add correlation IDs for request tracing
- Separate business events from debug logs

## Implementation Order:

1. **Start with Phase 1** - Error types are foundational
2. **Then Phase 2** - Type safety enables everything else
3. **Phase 3 & 4 in parallel** - Can be done independently
4. **Phase 5** - Only after other phases stabilize the interfaces
5. **Phase 6** - Production concerns last

## Success Criteria:

- ✅ No `console.warn/error` in library code
- ✅ No `process.exit()` in library code  
- ✅ No `as any` type assertions
- ✅ No static-only classes
- ✅ All errors have specific types with context
- ✅ All public interfaces have domain-specific types
- ✅ No files over 200 lines
- ✅ Each module has single responsibility

## Current Status: Phase 1 - COMPLETED ✅

**Estimated Impact:** This will reduce the codebase from exploration-phase patterns to production-ready domain abstractions, making it much more maintainable and debuggable.

## Completed Work:
- ✅ Decomposed 389-line god object in main.ts into focused modules
- ✅ Applied #private fields and readonly modifiers per coding style
- ✅ Created transport abstraction layer
- ✅ Separated CLI concerns from core logic
- ✅ Added monitoring/statistics module

### Phase 1 Completed ✅:
- ✅ Created domain-specific error hierarchy in /src/errors/
- ✅ Replaced console.warn/error with proper error throwing
- ✅ Removed process.exit() from library code
- ✅ Added structured error types: ConfigurationError, TransportError, OpenApiError, ServerError
- ✅ Added error utilities: isQuickMcpError, getErrorMessage, getErrorStack

### Phase 2 Completed ✅:
- ✅ Improved type assertion in openapi.ts (removed `as any`)
- ✅ Created Headers domain class to replace Record<string, string>
- ✅ Created specific override interfaces (ServerFactoryOverrides) to replace Partial<ServerOptions>
- ✅ Updated all modules to use Headers instead of generic Record
- ✅ Added proper header validation with HTTP field name checks
- ⚠️ Kept `as Transport` assertion (necessary due to SDK interface design)

### Phase 3 Completed ✅:
- ✅ Converted TransportFactory static class to `createTransport()` function
- ✅ Made ConfigurationBuilder truly immutable (each method returns new instance)
- ✅ Added `createConfigurationBuilder()` factory function
- ✅ Removed all static-only classes from codebase
- ✅ Added proper deprecation warnings for backward compatibility classes
- ✅ Added domain-specific error handling in transport creation

## Next Actions (Phase 4):
- [ ] Create Headers domain class (already done in Phase 2)
- [ ] Replace generic patterns with domain-specific methods
- [ ] Add proper validation and business logic to domain objects