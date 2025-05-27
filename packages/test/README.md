# @quick-mcp/test

LLM-powered testing tool for Quick-MCP servers that validates functionality through actual AI interaction.

## Features

- **Real AI Testing**: Uses actual LLMs to test your MCP server like a real AI assistant would
- **Multi-Model Support**: Test with local models (via Ollama, LM Studio) and remote APIs (OpenAI, Anthropic, etc.)
- **Scenario-Based Testing**: Define test scenarios in YAML for systematic validation
- **Automated Discovery**: LLMs naturally discover and test available tools and resources
- **Quality Assertions**: Validate response quality, tool usage, and error handling
- **Performance Metrics**: Track response times, success rates, and tool effectiveness

## Quick Start

```bash
# Install dependencies
pnpm install

# Test with OpenAI
npx @quick-mcp/test --spec https://api.example.com/openapi.json --model gpt-4o-mini

# Test with local model
npx @quick-mcp/test --spec ./api.yaml --model localhost:1234

# Run comprehensive test suite
npx @quick-mcp/test --spec ./api.yaml --scenarios comprehensive --models gpt-4o,claude-3-5-sonnet
```

## Usage

### Basic Testing
```bash
quick-mcp-test --spec <openapi-spec> --model <model-name>
```

### Custom Scenarios
```bash
quick-mcp-test --spec ./api.yaml --scenarios ./test-scenarios.yaml --model gpt-4o
```

### Multi-Model Validation
```bash
quick-mcp-test --spec ./api.yaml --models gpt-4o,claude-3-5-sonnet,localhost:1234
```

## Test Scenarios

Define test scenarios in YAML:

```yaml
scenarios:
  - name: "Tool Discovery"
    prompt: "What tools are available? List them."
    expect:
      - tool_count: ">= 3"
      - response_contains: ["user", "post"]
      
  - name: "Data Retrieval"
    prompt: "Get user with ID 123"
    expect:
      - calls_tool: "get_user"
      - response_time: "< 2s"
      - response_quality: "> 0.8"
```

## Architecture

This tool acts as an MCP client that:
1. Connects to your Quick-MCP server
2. Uses real LLMs to interact with available tools/resources
3. Validates responses and behavior
4. Reports results and metrics

Perfect for CI/CD, development validation, and quality assurance.