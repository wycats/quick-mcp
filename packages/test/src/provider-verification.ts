/**
 * Provider Verification Tool
 * Helps identify optimal provider setup for different models
 */

import chalk from 'chalk';

import { LLMRunner } from './llm-runner.ts';

export async function verifyProvider(modelName: string): Promise<void> {
  console.log(chalk.cyan(`Verifying adapter setup for: ${chalk.white(modelName)}`));
  console.log();

  // Test the actual adapter implementation
  const adapterTest = await testAdapterImplementation(modelName);
  
  // Display adapter status in clean table format
  const maxLabelWidth = 16;
  console.log(chalk.blue('Adapter Verification'));
  console.log('─'.repeat(50));
  console.log(`${'Model'.padEnd(maxLabelWidth)} ${modelName}`);
  console.log(`${'Provider'.padEnd(maxLabelWidth)} ${adapterTest.providerUsed}`);
  console.log(`${'Initialization'.padEnd(maxLabelWidth)} ${adapterTest.initStatus}`);
  console.log(`${'Tool Calling'.padEnd(maxLabelWidth)} ${adapterTest.toolCallStatus}`);
  
  if (adapterTest.error) {
    console.log(`${'Error'.padEnd(maxLabelWidth)} ${chalk.red(adapterTest.error)}`);
  }
  console.log();

  // Provide adapter-focused recommendations
  const adapterAdvice = getAdapterAdvice(adapterTest);
  if (adapterAdvice.length > 0) {
    console.log(chalk.cyan('Recommendations'));
    console.log('─'.repeat(50));
    for (const advice of adapterAdvice) {
      console.log(advice);
    }
    console.log();
  }
}

interface AdapterTest {
  providerUsed: string;
  initStatus: string;
  toolCallStatus: string;
  error?: string;
}

async function testAdapterImplementation(modelName: string): Promise<AdapterTest> {
  console.log(chalk.gray('  Testing adapter initialization...'));
  
  try {
    // Test 1: Can we create the LLM runner?
    const runner = new LLMRunner(modelName);
    const config = runner.modelConfig;
    
    const providerUsed = getProviderDescription(config.provider);
    const initStatus = chalk.green('Success');
    
    // Test 2: Can we actually call the model with a simple tool?
    console.log(chalk.gray('  Testing tool calling capability...'));
    
    let toolCallStatus: string;
    try {
      const toolCallResult = await testSimpleToolCall(runner);
      toolCallStatus = toolCallResult;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('API key') || errorMsg.includes('authentication')) {
        toolCallStatus = chalk.yellow('Needs authentication');
      } else if (errorMsg.includes('timeout')) {
        toolCallStatus = chalk.yellow('Timeout (model too slow/unresponsive)');
      } else if (errorMsg.includes('network') || errorMsg.includes('connection')) {
        toolCallStatus = chalk.yellow('Network connection issue');
      } else if (errorMsg.includes('tool')) {
        toolCallStatus = chalk.red('Tool calling not supported');
      } else {
        toolCallStatus = chalk.red(errorMsg.slice(0, 60));
      }
    }
    
    return { providerUsed, initStatus, toolCallStatus };
    
  } catch (error) {
    return {
      providerUsed: 'Unknown',
      initStatus: chalk.red('Failed'),
      toolCallStatus: chalk.gray('Skipped'),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function getProviderDescription(provider: string): string {
  switch (provider) {
    case 'ollama': return 'ollama-ai-provider';
    case 'openai': return '@ai-sdk/openai';
    case 'anthropic': return '@ai-sdk/anthropic';
    case 'local': return 'OpenAI-compatible endpoint';
    default: return 'Unknown provider';
  }
}

async function testSimpleToolCall(runner: LLMRunner): Promise<string> {
  // Create a simple mock MCP client with one basic tool
  const mockMCPClient = {
    async getTools() {
      return [{
        name: 'getCurrentTime',
        description: 'Get the current time',
        inputSchema: { 
          type: 'object',
          properties: {},
          required: []
        },
      }];
    },
    async callTool() {
      console.log('🔧 Debug: Mock tool getCurrentTime was called!');
      return { time: new Date().toISOString() };
    },
  };
  
  console.log('🔧 Debug: Starting tool call test...');
  
  // Try to execute a simple scenario with timeout
  const timeoutMs = 15000; // 15 second timeout for better debugging
  
  try {
    const result = await Promise.race([
      runner.executeScenario(
        {
          name: 'Tool Test',
          prompt: 'What time is it right now? Please use the getCurrentTime tool to get the current time.',
          expect: [],
        },
        mockMCPClient as any,
        timeoutMs
      ),
      new Promise<never>((_, reject) => {
        setTimeout(() => { reject(new Error('timeout')); }, timeoutMs);
      })
    ]);
    
    console.log('🔧 Debug: Test completed');
    console.log('🔧 Debug: Success:', result.success);
    console.log('🔧 Debug: Tool calls count:', result.toolCalls.length);
    console.log('🔧 Debug: Response text:', result.response.slice(0, 200));
    
    if (result.success && result.toolCalls.length > 0) {
      return chalk.green(`Tool calling works (${result.toolCalls.length} calls)`);
    } else if (result.toolCalls.length === 0) {
      return chalk.yellow('No tools called (may not support tool calling)');
    } else {
      return chalk.red('Tool call failed');
    }
  } catch (error) {
    console.log('🔧 Debug: Test failed with error:', error);
    throw error;
  }
}

function getAdapterAdvice(adapterTest: AdapterTest): string[] {
  const advice: string[] = [];
  
  if (adapterTest.initStatus.includes('Failed')) {
    advice.push('• Check if the model provider is correctly installed');
    advice.push('• Verify model name format (e.g., ollama:model-name)');
  }
  
  if (adapterTest.toolCallStatus.includes('authentication')) {
    advice.push('• Set up required API keys (OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.)');
  }
  
  if (adapterTest.toolCallStatus.includes('No tools called')) {
    advice.push('• Model may not support tool calling - try with known tool-calling model');
    advice.push('• Consider testing with OpenAI GPT-4 to verify adapter works correctly');
  }
  
  if (adapterTest.toolCallStatus.includes('Tool calling works')) {
    advice.push(chalk.green('• Adapter is working correctly for tool calling!'));
  }
  
  if (adapterTest.providerUsed.includes('OpenAI-compatible')) {
    advice.push('• Consider using dedicated provider if available (e.g., ollama-ai-provider for Ollama)');
  }
  
  return advice;
}

