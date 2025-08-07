# Tool Calling Research - Ollama & Llama 3.2

## Key Findings

### Ollama Tool Support Status

- **Officially supported models**: Llama 3.1, Mistral Nemo, Firefunction v2, Command-R+
- **Llama 3.2**: Not explicitly listed in Ollama's official tool support documentation
- **Note**: Llama 3.2 may still work but might require different prompting strategies

### Tool Calling Format Requirements

#### Standard OpenAI-Compatible Format

```python
tools = [{
    'type': 'function',
    'function': {
        'name': 'get_current_weather',
        'description': 'Get the current weather for a city',
        'parameters': {
            'type': 'object',
            'properties': {
                'city': {
                    'type': 'string',
                    'description': 'The name of the city',
                },
            },
            'required': ['city'],
        },
    },
}]
```

#### Ollama Python Library v0.4+ Approach

```python
# Define function with proper annotations
def add_two_numbers(a: int, b: int) -> int:
    """ Add two numbers
    Args:
        a: The first integer number  
        b: The second integer number
    Returns:
        int: The sum of the two numbers
    """
    return a + b

# Use function directly as tool
response = ollama.chat(
    'llama3.1',
    messages=[{'role': 'user', 'content': 'What is 10 + 10?'}],
    tools=[add_two_numbers],  # Actual function reference
)
```

### Manual Prompting Strategy for Non-Native Support

For models without native tool calling, use explicit JSON response format:

```
Available tools:
- get_current_time: Get the current time (no parameters)

If you need to use a tool, respond in this exact JSON format:
{
    "tool_call": {
        "name": "get_current_time",
        "arguments": {}
    }
}

Question: What time is it?
```

### Potential Issues with Our Current Implementation

1. **Model Support**: Llama 3.2 might not be in Ollama's official tool calling list
2. **Prompting Strategy**: We're using AI SDK's tool calling, but might need manual prompting
3. **Schema Format**: Our JSON Schema → Zod conversion might not match expected format
4. **Temperature/Settings**: Tool calling often works better with lower temperature

### Recommendations

1. **Test with Known Working Model**: Try `llama3.1` first to verify our adapter works
2. **Implement Manual Prompting Fallback**: Add explicit tool calling instructions in prompt
3. **Adjust Model Settings**: Use lower temperature (0.1-0.3) for tool calling
4. **Check Ollama Version**: Ensure latest Ollama version with tool support

### AI SDK Integration Considerations

Our current implementation uses Vercel AI SDK with:

- JSON Schema to Zod conversion
- `generateText()` with tools parameter
- Ollama provider via `ollama-ai-provider`

This should work if the model supports tool calling, but we might need:

- Manual response parsing for unsupported models
- Different prompt templates
- Response format validation

## Vercel AI SDK API Analysis

### Our Current Implementation

```javascript
const result = await generateText({
  model: this.#model,
  prompt: scenario.prompt,
  tools,                    // ✅ Correct format
  maxSteps: 10,            // ✅ Correct for multi-step
});
```

### Issues Found

1. **Missing Tool Call Tracking**: We're not extracting tool calls from the result

   ```javascript
   // We should access: result.steps, result.toolCalls, result.toolResults
   ```

2. **No Error Handling for Tool Failures**: No handling for invalid tool args or execution errors

3. **No Tool Choice Control**: We're using default `auto` mode, might want `required` for testing

4. **Missing Response Analysis**: Not checking if tools were actually called vs just text response

### Correct API Usage

According to documentation, we should:

```javascript
const result = await generateText({
  model: this.#model,
  prompt: scenario.prompt,
  tools,
  maxSteps: 10,
  toolChoice: 'auto', // or 'required' for testing
});

// Access tool calls
console.log('Steps:', result.steps);
console.log('Tool calls:', result.toolCalls); 
console.log('Tool results:', result.toolResults);
```

### Tool Definition Format - ✅ CORRECT

Our tool definition format is correct:

```javascript
tools[mcpTool.name] = tool({
  description: mcpTool.description,  // ✅ Correct
  parameters: zodSchema,             // ✅ Correct Zod schema
  execute: async (args) => { ... },  // ✅ Correct async function
});
```

### Model Provider - ✅ CORRECT

Our ollama provider usage is correct:

```javascript
const model = ollama(this.#modelConfig.name, {
  baseURL: this.#modelConfig.endpoint,  // ✅ Correct
});
```

## Issues to Fix

1. **Extract tool call information from result**
2. **Add proper error handling**
3. **Use `toolChoice: 'required'` for testing**
4. **Add debugging output for tool calls**
5. **Test with known working model first**

## Next Steps

1. Test with `llama3.1` to validate adapter
2. Fix tool call tracking in our implementation  
3. Add debugging output to see what's happening
4. Implement manual prompting strategy for `llama3.2`  
5. Add model-specific tool calling detection
6. Create fallback mechanisms for non-tool-calling models
