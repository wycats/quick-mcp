# Vibe Coding Practices with Claude

This document establishes practices for working with AI coding assistants (particularly Claude) that ensure proper consolidation phases and maintain code quality over time.

## Core Philosophy

Vibe coding with AI is a two-phase process:

1. **Exploration Phase**: Rapid prototyping with AI assistance
2. **Consolidation Phase**: Manual refinement to production quality

The consolidation phase is **not optional** - it's what makes the process sustainable.

## Phase 1: Exploration (Vibe Mode)

### When to Use

- Initial project setup
- Exploring new APIs or libraries
- Prototyping features
- Generating boilerplate code

### Best Practices

```markdown
✅ DO:

- Use Claude to generate initial structure
- Explore multiple approaches quickly
- Focus on getting something working
- Defer optimization decisions

❌ DON'T:

- Accept generated code as final
- Skip error handling "for now"
- Ignore code smells
- Accumulate technical debt
```

### Example Prompts

```markdown
GOOD: "Help me prototype a vector search feature"
BAD: "Write production-ready vector search"
```

## Phase 2: Consolidation (Critical)

### Mandatory Consolidation Tasks

#### 1. **Extract Abstractions**

```typescript
// Before (AI generated)
async function indexFile(path: string) {
  const data = await fs.readFile(path);
  const parsed = await pdf(data);
  const chunks = parsed.text.split(".");
  // ... 50 more lines
}

// After (Consolidated)
class DocumentProcessor {
  async process(path: string): Promise<Document> {
    const content = await this.#readDocument(path);
    const chunks = this.#chunkContent(content);
    return this.#createDocument(chunks);
  }

  // Private methods with single responsibilities
}
```

#### 2. **Write Real Tests**

```typescript
// Not just happy path tests
describe("DocumentProcessor", () => {
  it("handles corrupted PDFs gracefully", async () => {
    // Test edge cases AI might miss
  });

  it("respects memory limits on large files", async () => {
    // Test resource constraints
  });
});
```

#### 3. **Document Intent**

```typescript
/**
 * Processes PDF documents for vector indexing.
 *
 * Design decisions:
 * - Chunks by sentence to preserve semantic meaning
 * - Uses streaming to handle large files
 * - Fails fast on corrupted data
 *
 * @example
 * const processor = new DocumentProcessor({ chunkSize: 1000 });
 * const doc = await processor.process('./script.pdf');
 */
```

#### 4. **Improve Error Handling**

```typescript
// Before
try {
  return await someOperation();
} catch (error) {
  console.error(error);
  throw error;
}

// After
try {
  return await someOperation();
} catch (error) {
  if (error instanceof NetworkError) {
    throw new IndexingError("Failed to fetch document", { cause: error });
  }
  throw new UnexpectedError("Document processing failed", { cause: error });
}
```

## Working with Claude: Specific Practices

### 1. **Session Boundaries**

```markdown
Start of Session:
"I need to add feature X. Let's start with exploration/prototyping."

Before Ending Session:
"Now let's consolidate. Help me:

1. Extract meaningful abstractions
2. Improve error handling
3. Add comprehensive tests
4. Document the design decisions"
```

### 2. **Consolidation Checklist**

Before considering any Claude session complete:

- [ ] Code follows patterns in `CODING_STYLE.md`
- [ ] All functions have explicit return types
- [ ] Error handling is comprehensive
- [ ] Tests cover edge cases
- [ ] Abstractions make sense for the domain
- [ ] Documentation explains "why" not just "what"
- [ ] No `any` types or `@ts-ignore`
- [ ] Dependencies justified per `PACKAGE_SELECTION.md`

### 3. **Progressive Enhancement**

```markdown
Iteration 1: "Get it working"
Iteration 2: "Make it clean"
Iteration 3: "Make it robust"
Iteration 4: "Make it performant"
```

### 4. **Domain-Specific Abstractions**

Transform generic code into domain-aware code:

```typescript
// Generic (AI Generated)
function processData(data: any): any {
  return data.map((item) => ({
    ...item,
    processed: true,
  }));
}

// Domain-Specific (Consolidated)
class ScriptIndexer {
  indexEpisode(episode: EpisodeScript): IndexedEpisode {
    return {
      ...episode,
      searchableText: this.#extractSearchableText(episode),
      metadata: this.#generateMetadata(episode),
      indexed: new Date(),
    };
  }
}
```

## Red Flags Requiring Immediate Consolidation

### 🚨 **Code Smells**

- Functions longer than 50 lines
- Nested callbacks or promise chains
- Duplicate code across files
- Mixed concerns in single function
- Poor variable names (`data`, `item`, `obj`)

### 🚨 **Missing Essentials**

- No error boundaries
- No input validation
- No resource cleanup
- No cancellation handling
- No progress reporting

### 🚨 **Test Smells**

- Only happy path tests
- No edge case coverage
- Tests that mirror implementation
- No integration tests
- Mocked everything

## Consolidation Workflow

### 1. **Review Generated Code**

```bash
# Use your linting tools
pnpm lint:strict

# Check type coverage
pnpm typecheck

# Look for code smells
grep -r "any" src/
grep -r "console.log" src/
grep -r "TODO" src/
```

### 2. **Identify Abstractions**

```markdown
Questions to ask:

- What patterns repeat?
- What would change together?
- What concepts emerge from the code?
- How would I explain this to a new developer?
```

### 3. **Refactor Systematically**

```typescript
// Step 1: Extract functions
// Step 2: Group related functions
// Step 3: Create classes/modules
// Step 4: Define interfaces
// Step 5: Add documentation
```

### 4. **Test Thoroughly**

```typescript
describe("Feature", () => {
  // 1. Happy path
  // 2. Edge cases
  // 3. Error conditions
  // 4. Performance boundaries
  // 5. Integration scenarios
});
```

## Example: Full Cycle

### Exploration Phase Output

```typescript
export async function searchScripts(query: string) {
  const files = await fs.readdir("./data");
  const results = [];

  for (const file of files) {
    const content = await fs.readFile(`./data/${file}`);
    if (content.includes(query)) {
      results.push({ file, content });
    }
  }

  return results;
}
```

### After Consolidation

```typescript
export interface SearchResult {
  readonly episode: EpisodeMetadata;
  readonly matches: ReadonlyArray<TextMatch>;
  readonly score: number;
}

export class ScriptSearchService {
  readonly #index: SearchIndex;
  readonly #log: LogLayer;

  constructor(deps: SearchServiceDeps) {
    this.#index = deps.index;
    this.#log = deps.logger;
  }

  async search(query: SearchQuery): Promise<ReadonlyArray<SearchResult>> {
    this.#validateQuery(query);

    const results = await this.#index.search({
      text: query.text,
      limit: query.limit ?? 10,
      filters: this.#buildFilters(query),
    });

    return results
      .map((result) => this.#transformResult(result))
      .sort((a, b) => b.score - a.score);
  }

  #validateQuery(query: SearchQuery): void {
    if (!query.text || query.text.trim().length === 0) {
      throw new ValidationError("Search query cannot be empty");
    }

    if (query.limit && (query.limit < 1 || query.limit > 100)) {
      throw new ValidationError("Search limit must be between 1 and 100");
    }
  }

  // ... additional private methods
}
```

## Metrics for Success

### Code Quality Indicators

- **Abstraction Level**: Domain concepts clearly represented
- **Error Handling**: All failure modes addressed
- **Test Coverage**: >80% with meaningful tests
- **Documentation**: Intent and design decisions captured
- **Type Safety**: No `any` or unchecked types

### Process Indicators

- **Time Split**: 30% exploration, 70% consolidation
- **Review Cycles**: At least 2 passes over generated code
- **Refactoring**: Significant structural improvements
- **Testing**: Tests written with "normal coding brain"

## Summary

Vibe coding with Claude is powerful but requires discipline:

1. **Exploration is just the start** - Never ship exploration code
2. **Consolidation is mandatory** - It's what makes code sustainable
3. **Use your expertise** - AI generates median code; you make it excellent
4. **Document the journey** - Capture why, not just what
5. **Test like you mean it** - Real tests for real edge cases

Remember: The goal isn't to code faster, it's to reach production quality faster. Consolidation is how we get there.
