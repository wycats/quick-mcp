# Quick-MCP Remediation Plan

## Root Cause Analysis

### 1. **TypeScript Strictness Issue**
The project uses `@tsconfig/strictest` which includes `exactOptionalPropertyTypes: true` and `noPropertyAccessFromIndexSignature: true`. These were likely enabled after Sonnet's initial work, causing:
- 41 compilation errors
- Index signature access violations (`property.field` → `property['field']`)
- Optional property type mismatches (`T | undefined` vs `T?`)

### 2. **Coverage Drop Timeline**
Based on SONNET_HANDOFF.md:
- Coverage was 93% initially
- Dropped to 81% after transport layer additions
- We further reduced it to 64.31% during Phase 2 fixes

### 3. **Build Process Issues**
- No pre-commit hooks to catch TypeScript errors
- Tests pass but build fails (different tsconfig?)
- Missing TypeScript config for packages/core

## Remediation Plan

### Phase 1: Immediate Stabilization (Hours 1-2)

#### 1.1 Fix TypeScript Configuration
```bash
# Create package-specific tsconfig that extends root
cat > packages/core/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "exactOptionalPropertyTypes": false,
    "noPropertyAccessFromIndexSignature": false
  },
  "include": ["src/**/*.ts"],
  "exclude": ["**/*.test.ts", "**/*.spec.ts"]
}
EOF
```

#### 1.2 Security Patch
```bash
# Update vite to fix vulnerability
pnpm update vite@^6.3.4 --recursive
```

#### 1.3 Quick Build Fix
Create a temporary build script that relaxes strictness for immediate stabilization.

### Phase 2: Systematic Error Resolution (Hours 2-4)

#### 2.1 Index Signature Access Errors (Priority: High)
**Pattern:** `error TS4111: Property 'X' comes from an index signature`
**Fix:** Change dot notation to bracket notation
```typescript
// Before
error.cause  
// After
error['cause']
```

**Files to fix:**
- packages/core/src/errors.test.ts (10 instances)
- packages/test/src/scenario-parser.ts (15 instances)
- packages/test/src/patterns/observability.ts (1 instance)

#### 2.2 Optional Property Type Errors (Priority: High)
**Pattern:** `error TS2375: Type with undefined not assignable`
**Fix:** Remove `| undefined` from optional properties
```typescript
// Before
interface Config {
  timeout?: number | undefined;
}
// After  
interface Config {
  timeout?: number;
}
```

**Files to fix:**
- packages/core/src/server.ts
- packages/test/src/patterns/error-handler.ts
- packages/test/src/patterns/observability.ts
- packages/test/src/patterns/scenario-enhancement.ts
- packages/test/src/scenario-parser.ts

#### 2.3 Type Mismatch Errors (Priority: Medium)
**Pattern:** `error TS2345: Argument type mismatch`
**Fix:** Correct argument types
```typescript
// packages/core/src/basic-coverage.test.ts
// Line 19: requestTimeoutError expects object, not string
const timeoutError = requestTimeoutError({ 
  url: 'https://example.com', 
  method: 'GET' 
});
```

### Phase 3: Code Cleanup (Hours 4-5)

#### 3.1 Remove Unused Files
```bash
# Remove identified dead code
rm packages/core/src/log.ts
rm packages/core/src/test/index.ts
rm packages/core/src/request/test-utils.ts
rm -rf packages/test/src/patterns/
rm packages/core/src/basic-coverage.test.ts
rm packages/core/.prettierrc
```

#### 3.2 Fix Markdown Issues
```bash
# Auto-fix markdown formatting
pnpm markdownlint --fix "*.md" "docs/*.md"
```

### Phase 4: Restore Test Coverage (Hours 5-8)

#### 4.1 Identify Coverage Gaps
```bash
pnpm test:coverage
# Focus on:
# - packages/core/src/client.ts (17.85%)
# - packages/core/src/config.ts (26.66%)
# - packages/core/src/cli.ts (40%)
```

#### 4.2 Add Missing Tests
Priority order based on production criticality:
1. Client operations (tool/resource invocation)
2. Configuration loading and validation
3. CLI command handling
4. Transport layer (stdio specifically)

### Phase 5: Prevention Measures (Hour 8)

#### 5.1 Pre-commit Hooks
```json
// package.json
{
  "scripts": {
    "pre-commit": "pnpm lint && pnpm test && pnpm build"
  }
}
```

#### 5.2 CI Configuration
```yaml
# .github/workflows/ci.yml
- run: pnpm build
- run: pnpm test
- run: pnpm lint --max-warnings=0
```

## Success Criteria

### Immediate (Phase 1-2)
- [ ] Build passes without errors
- [ ] Security vulnerability patched
- [ ] All existing tests still pass

### Short-term (Phase 3-4)
- [ ] Dead code removed
- [ ] Test coverage restored to >70%
- [ ] Markdown lint passes

### Long-term (Phase 5)
- [ ] Pre-commit hooks prevent broken builds
- [ ] CI/CD pipeline enforces quality gates
- [ ] TypeScript strictness maintained without breaking

## Execution Order

1. **Hour 0-1:** TypeScript config fix + security patch
2. **Hour 1-2:** Fix index signature errors (mechanical changes)
3. **Hour 2-3:** Fix optional property errors
4. **Hour 3-4:** Fix type mismatches
5. **Hour 4-5:** Clean up unused code
6. **Hour 5-7:** Write missing tests
7. **Hour 7-8:** Set up prevention measures

## Risk Mitigation

- **Backup current state** before making changes
- **Test each phase** independently
- **Option to relax TypeScript strictness** temporarily if needed
- **Focus on build first**, then improve coverage

## Alternative: Quick Fix

If time-critical, temporarily relax TypeScript strictness:
```json
// tsconfig.json
{
  "extends": "@tsconfig/strict", // Instead of strictest
  "compilerOptions": {
    "exactOptionalPropertyTypes": false,
    "noPropertyAccessFromIndexSignature": false
  }
}
```

This would immediately fix ~30 of the 41 errors but reduces type safety.