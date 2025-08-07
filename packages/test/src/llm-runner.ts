/**
 * LLM Runner using Vercel AI SDK
 * Integrates with various model providers and executes test scenarios
 */

import { openai , createOpenAI } from '@ai-sdk/openai';
import { generateText, tool } from 'ai';
import type {LanguageModel, Tool} from 'ai';
import { ollama } from 'ollama-ai-provider';
import { z } from 'zod';

import type { MCPClient } from './mcp-client.ts';
import type { TestScenario, TestResult, ToolCall, TestMetrics, ModelConfig } from './types.ts';

// Type definitions for JSON Schema
interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  description?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  items?: JsonSchema;
}

// Type definitions for AI SDK result structures
interface ToolCallResult {
  toolCallId: string;
  result: unknown;
}

interface ToolCallInfo {
  toolName: string;
  args: Record<string, unknown>;
  toolCallId: string;
}

interface StepInfo {
  toolCalls?: ToolCallInfo[];
  toolResults?: ToolCallResult[];
}

export class LLMRunner {
  #model: LanguageModel;
  #modelConfig: ModelConfig;

  constructor(modelName: string) {
    this.#modelConfig = this.#parseModelName(modelName);
    this.#model = this.#createModel();
  }

  /**
   * Execute a test scenario using the LLM
   */
  async executeScenario(
    scenario: TestScenario,
    mcpClient: MCPClient,
    timeout = 30000,
  ): Promise<TestResult> {
    const startTime = Date.now();
    const toolCalls: ToolCall[] = [];

    try {
      // Convert MCP tools to AI SDK format
      const tools = await this.#convertMCPToolsToAISDK(mcpClient);

      // Execute the scenario
      const result = await Promise.race([
        this.#runScenario(scenario, tools, mcpClient, toolCalls),
        this.#timeoutPromise(timeout),
      ]);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Calculate metrics
      const metrics: TestMetrics = {
        duration,
        responseTime: duration, // Will be more precise in actual implementation
        toolCallCount: toolCalls.length,
        qualityScore: this.#calculateQualityScore(result.text, scenario),
      };

      return {
        scenario,
        model: this.#modelConfig.name,
        success: true,
        response: result.text,
        toolCalls,
        metrics,
        assertions: [], // Will be filled by assertion engine
        timestamp: new Date(),
      };

    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      return {
        scenario,
        model: this.#modelConfig.name,
        success: false,
        response: '',
        toolCalls,
        metrics: {
          duration,
          responseTime: duration,
          toolCallCount: toolCalls.length,
        },
        assertions: [],
        error: error instanceof Error ? error : new Error(String(error)),
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get model information
   */
  get modelConfig(): ModelConfig {
    return this.#modelConfig;
  }

  /**
   * Parse model name and determine provider
   */
  #parseModelName(modelName: string): ModelConfig {
    // Ollama models (format: ollama:model-name)
    if (modelName.startsWith('ollama:')) {
      const ollamaModel = modelName.substring('ollama:'.length);
      return {
        name: ollamaModel,
        provider: 'ollama',
        config: { endpoint: 'http://localhost:11434' },
        endpoint: 'http://localhost:11434',
        requiresAuth: false,
      };
    }

    // Local model (localhost:port or IP:port)
    if (modelName.includes('localhost:') || /^\d+\.\d+\.\d+\.\d+:\d+$/.test(modelName)) {
      return {
        name: modelName,
        provider: 'local',
        config: { endpoint: `http://${modelName}` },
        endpoint: `http://${modelName}`,
        requiresAuth: false,
      };
    }

    // OpenAI models
    if (modelName.startsWith('gpt-') || modelName.startsWith('o1-')) {
      return {
        name: modelName,
        provider: 'openai',
        config: {},
        requiresAuth: true,
      };
    }

    // Anthropic models
    if (modelName.startsWith('claude-')) {
      return {
        name: modelName,
        provider: 'anthropic',
        config: {},
        requiresAuth: true,
      };
    }

    // Default to OpenAI for unknown models
    return {
      name: modelName,
      provider: 'openai',
      config: {},
      requiresAuth: true,
    };
  }

  /**
   * Create appropriate model instance
   */
  #createModel(): LanguageModel {
    switch (this.#modelConfig.provider) {
      case 'openai':
        if (!process.env['OPENAI_API_KEY']) {
          throw new Error('OPENAI_API_KEY environment variable required for OpenAI models');
        }
        return openai(this.#modelConfig.name);

      case 'ollama':
        // Use dedicated Ollama provider for better tool calling support
        return ollama(this.#modelConfig.name, {
          baseURL: this.#modelConfig.endpoint,
        });

      case 'local':
        // Use OpenAI-compatible client for local models
        const localProvider = createOpenAI({
          baseURL: `${this.#modelConfig.endpoint ?? 'http://localhost:1234'}/v1`,
          apiKey: 'local', // Local models often don't need real API keys
        });
        return localProvider('gpt-3.5-turbo'); // Use compatible model name

      case 'anthropic':
        throw new Error('Anthropic models not yet implemented - use @ai-sdk/anthropic');

      default:
        throw new Error(`Unsupported model provider: ${this.#modelConfig.provider}`);
    }
  }

  /**
   * Convert MCP tools to AI SDK format
   */
  async #convertMCPToolsToAISDK(mcpClient: MCPClient): Promise<Record<string, Tool>> {
    const mcpTools = await mcpClient.getTools();
    const tools: Record<string, Tool> = {};

    for (const mcpTool of mcpTools) {
      
      // Convert JSON Schema to Zod schema
      const zodSchema = this.#jsonSchemaToZod(mcpTool.inputSchema);
      
      tools[mcpTool.name] = tool({
        description: mcpTool.description,
        parameters: zodSchema,
        execute: async (args: Record<string, unknown>) => {
          const startTime = Date.now();
          try {
            const result = await mcpClient.callTool(mcpTool.name, args);
            return {
              result,
              success: true,
              duration: Date.now() - startTime,
            };
          } catch (error) {
            return {
              error: error instanceof Error ? error.message : String(error),
              success: false,
              duration: Date.now() - startTime,
            };
          }
        },
      });
    }

    return tools;
  }

  /**
   * Convert JSON Schema to Zod schema
   */
  #jsonSchemaToZod(schema: unknown): z.ZodSchema {
    if (typeof schema !== 'object' || schema === null) {
      return z.any();
    }

    const jsonSchema = schema as JsonSchema;

    // Handle object schemas
    if (jsonSchema.type === 'object') {
      if (!jsonSchema.properties) {
        return z.object({});
      }

      const zodProperties: Record<string, z.ZodSchema> = {};
      
      for (const [key, propSchema] of Object.entries(jsonSchema.properties)) {
        zodProperties[key] = this.#jsonSchemaToZod(propSchema);
      }

      let objectSchema = z.object(zodProperties);

      // Handle required fields
      if (jsonSchema.required && Array.isArray(jsonSchema.required)) {
        const requiredFields = new Set(jsonSchema.required);
        const partialProperties: Record<string, z.ZodSchema> = {};
        
        for (const [key, zodProp] of Object.entries(zodProperties)) {
          if (requiredFields.has(key)) {
            partialProperties[key] = zodProp;
          } else {
            partialProperties[key] = zodProp.optional();
          }
        }
        
        objectSchema = z.object(partialProperties);
      }

      return objectSchema;
    }

    // Handle primitive types
    switch (jsonSchema.type) {
      case 'string':
        let stringSchema = z.string();
        if (jsonSchema.description) {
          stringSchema = stringSchema.describe(jsonSchema.description);
        }
        if (jsonSchema.enum && Array.isArray(jsonSchema.enum) && jsonSchema.enum.length > 0) {
          return z.enum(jsonSchema.enum as [string, ...string[]]);
        }
        return stringSchema;
        
      case 'number':
        let numberSchema = z.number();
        if (jsonSchema.description) {
          numberSchema = numberSchema.describe(jsonSchema.description);
        }
        if (typeof jsonSchema.minimum === 'number') {
          numberSchema = numberSchema.min(jsonSchema.minimum);
        }
        return numberSchema;
        
      case 'integer':
        let intSchema = z.number().int();
        if (jsonSchema.description) {
          intSchema = intSchema.describe(jsonSchema.description);
        }
        if (typeof jsonSchema.minimum === 'number') {
          intSchema = intSchema.min(jsonSchema.minimum);
        }
        return intSchema;
        
      case 'boolean':
        let boolSchema = z.boolean();
        if (jsonSchema.description) {
          boolSchema = boolSchema.describe(jsonSchema.description);
        }
        return boolSchema;
        
      case 'array':
        let arraySchema = z.array(this.#jsonSchemaToZod(jsonSchema.items ?? {}));
        if (jsonSchema.description) {
          arraySchema = arraySchema.describe(jsonSchema.description);
        }
        return arraySchema;
        
      default:
        return z.any();
    }
  }

  /**
   * Run the actual scenario with the LLM
   */
  async #runScenario(
    scenario: TestScenario,
    tools: Record<string, Tool>,
    _mcpClient: MCPClient,
    toolCalls: ToolCall[],
  ): Promise<{ text: string; responseTime: number }> {
    const startTime = Date.now();
    
    try {
      const result = await generateText({
        model: this.#model,
        prompt: scenario.prompt,
        tools,
        maxSteps: 10, // Allow multiple tool calls
        temperature: 0.2, // Lower temperature for more consistent tool calling
        maxTokens: 1000, // Limit response length to improve speed
        ...(Object.keys(tools).length > 0 && { toolChoice: 'auto' as const }), // Enable tool calling if tools available
      });
      const endTime = Date.now();

      // Extract tool calls from result for tracking
      if (result.steps.length > 0) {
        console.log(`🔧 Debug: Found ${result.steps.length} steps in result`);
        for (const step of result.steps) {
          const stepInfo = step as StepInfo;
          if (stepInfo.toolCalls && stepInfo.toolCalls.length > 0) {
            console.log(`🔧 Debug: Step has ${stepInfo.toolCalls.length} tool calls`);
            for (const toolCall of stepInfo.toolCalls) {
              console.log(`🔧 Debug: Tool call - ${toolCall.toolName} with args:`, toolCall.args);
              // Find the corresponding tool result if available
              const toolResult = stepInfo.toolResults?.find(
                (result) => result.toolCallId === toolCall.toolCallId
              );
              
              toolCalls.push({
                name: toolCall.toolName,
                arguments: toolCall.args,
                response: toolResult?.result ?? {},
                success: true, // Assume success unless we get error info
                duration: 0, // Will be filled by tool execution
              });
            }
          }
        }
      }

      // Log if no tool calls were detected
      if (result.steps.length === 0 || 
          !result.steps.some((step) => {
            const stepInfo = step as StepInfo;
            return stepInfo.toolCalls && stepInfo.toolCalls.length > 0;
          })) {
        console.log(`🔧 Debug: No tool calls detected in result`);
        console.log(`🔧 Debug: Available tools:`, Object.keys(tools));
        console.log(`🔧 Debug: Response text:`, result.text.slice(0, 200));
      }

      return {
        text: result.text,
        responseTime: endTime - startTime,
      };
    } catch (error) {
      console.log(`🔧 Debug: Error in runScenario:`, error);
      throw error;
    }
  }

  /**
   * Create timeout promise
   */
  #timeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Test scenario timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Calculate response quality score (0-1)
   */
  #calculateQualityScore(response: string, scenario: TestScenario): number {
    // Simple quality scoring based on response length and content
    // In a production version, this could use more sophisticated NLP
    
    if (!response || response.trim().length === 0) {
      return 0;
    }

    let score = 0.5; // Base score

    // Length factor (reasonable responses are usually not too short or too long)
    const length = response.length;
    if (length > 50 && length < 1000) {
      score += 0.2;
    }

    // Contains relevant keywords from prompt
    const promptWords = scenario.prompt.toLowerCase().split(/\s+/);
    const responseWords = response.toLowerCase().split(/\s+/);
    const overlap = promptWords.filter(word => responseWords.includes(word)).length;
    score += Math.min(overlap / promptWords.length, 0.3);

    // Penalize error indicators
    if (response.toLowerCase().includes('error') || response.toLowerCase().includes('failed')) {
      score -= 0.2;
    }

    return Math.max(0, Math.min(1, score));
  }
}