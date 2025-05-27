/**
 * Test Runner
 * Orchestrates MCP client, LLM runner, and test execution
 */

import chalk from 'chalk';
import ora from 'ora';

import { runAssertions } from './assertions.ts';
import { LLMRunner } from './llm-runner.ts';
import { MCPClient } from './mcp-client.ts';
import { loadScenarios } from './scenario-parser.ts';
import type { TestConfig, TestResult, TestSuite, TestSummary, TestScenario } from './types.ts';


export class TestRunner {
  #config: TestConfig;
  #mcpClient: MCPClient | null = null;
  #llmRunners = new Map<string, LLMRunner>();

  constructor(config: TestConfig) {
    this.#config = config;
  }

  /**
   * Initialize test runner
   */
  async initialize(): Promise<void> {
    // Initialize MCP client
    this.#mcpClient = new MCPClient(this.#config.serverUrl);
    await this.#mcpClient.connect(this.#config.spec);

    // Initialize LLM runners for each model
    for (const model of this.#config.models) {
      try {
        const runner = new LLMRunner(model);
        this.#llmRunners.set(model, runner);
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  Failed to initialize model ${model}: ${error instanceof Error ? error.message : String(error)}`));
      }
    }

    if (this.#llmRunners.size === 0) {
      throw new Error('No models could be initialized');
    }

    // Verify MCP connection
    if (!this.#mcpClient.isConnected) {
      throw new Error('Failed to establish MCP connection');
    }

    // Display connection info
    const connection = this.#mcpClient.connection;
    if (!connection) {
      throw new Error('MCP connection not established');
    }
    console.log(chalk.green('✅ Connected to MCP server'));
    console.log(`  • Tools: ${chalk.white(connection.tools.length)}`);
    console.log(`  • Resources: ${chalk.white(connection.resources.length)}`);
    console.log(`  • Models: ${chalk.white(Array.from(this.#llmRunners.keys()).join(', '))}`);
  }

  /**
   * Run all test scenarios
   */
  async run(): Promise<TestSuite> {
    if (!this.#mcpClient || this.#llmRunners.size === 0) {
      throw new Error('Test runner not initialized');
    }

    const scenarios = Array.isArray(this.#config.scenarios) 
      ? this.#config.scenarios 
      : await loadScenarios(this.#config.scenarios as string);

    const results: TestResult[] = [];
    const startTime = Date.now();

    console.log(chalk.cyan(`🧪 Running ${scenarios.length} scenarios across ${this.#llmRunners.size} models...`));
    console.log();

    // Run scenarios
    if (this.#config.options?.parallel) {
      // Parallel execution
      const promises: Promise<TestResult[]>[] = [];
      
      for (const [model, runner] of this.#llmRunners) {
        promises.push(this.#runScenariosForModel(scenarios, model, runner));
      }
      
      const modelResults = await Promise.all(promises);
      results.push(...modelResults.flat());
    } else {
      // Sequential execution
      for (const [model, runner] of this.#llmRunners) {
        const modelResults = await this.#runScenariosForModel(scenarios, model, runner);
        results.push(...modelResults);
      }
    }

    const endTime = Date.now();

    // Calculate summary
    const summary = this.#calculateSummary(results, endTime - startTime);

    return {
      config: this.#config,
      results,
      summary,
      timestamp: new Date(),
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.#mcpClient) {
      await this.#mcpClient.disconnect();
    }
  }

  /**
   * Run scenarios for a specific model
   */
  async #runScenariosForModel(
    scenarios: TestScenario[],
    model: string,
    runner: LLMRunner,
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const timeout = this.#config.options?.timeout ?? 30000;

    for (const scenario of scenarios) {
      if (scenario.skip) {
        console.log(chalk.gray(`⏭️  Skipping: ${scenario.name} (${model})`));
        continue;
      }

      const spinner = ora(`Running: ${scenario.name} (${model})`).start();

      try {
        // Execute scenario
        if (!this.#mcpClient) {
          throw new Error('MCP client not initialized');
        }
        const result = await runner.executeScenario(scenario, this.#mcpClient, scenario.timeout ?? timeout);
        
        // Run assertions
        result.assertions = await runAssertions(scenario.expect, result);
        
        // Update success based on assertions
        result.success = result.success && result.assertions.every(a => a.passed);

        results.push(result);

        if (result.success) {
          spinner.succeed(chalk.green(`✅ ${scenario.name} (${model})`));
        } else {
          const failedAssertions = result.assertions.filter(a => !a.passed).length;
          spinner.fail(chalk.red(`❌ ${scenario.name} (${model}) - ${failedAssertions} assertion(s) failed`));
        }

        // Show details in verbose mode
        if (this.#config.options?.verbose) {
          this.#showTestDetails(result);
        }

      } catch (error) {
        spinner.fail(chalk.red(`💥 ${scenario.name} (${model}) - Error: ${error instanceof Error ? error.message : String(error)}`));
        
        results.push({
          scenario,
          model,
          success: false,
          response: '',
          toolCalls: [],
          metrics: { duration: 0, responseTime: 0, toolCallCount: 0 },
          assertions: [],
          error: error instanceof Error ? error : new Error(String(error)),
          timestamp: new Date(),
        });
      }

      // Add delay between tests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Show detailed test results
   */
  #showTestDetails(result: TestResult): void {
    console.log(chalk.dim(`    Response: ${result.response.substring(0, 100)}${result.response.length > 100 ? '...' : ''}`));
    console.log(chalk.dim(`    Tools called: ${result.toolCalls.map(t => t.name).join(', ') || 'none'}`));
    console.log(chalk.dim(`    Duration: ${result.metrics.duration}ms`));
    
    if (result.assertions.some(a => !a.passed)) {
      console.log(chalk.red(`    Failed assertions:`));
      result.assertions.filter(a => !a.passed).forEach(a => {
        console.log(chalk.red(`      • ${a.assertion.type}: ${a.message ?? 'assertion failed'}`));
      });
    }
    console.log();
  }

  /**
   * Calculate test summary
   */
  #calculateSummary(results: TestResult[], totalDuration: number): TestSummary {
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalToolCalls = results.reduce((sum, r) => sum + r.toolCalls.length, 0);
    const totalResponseTime = results.reduce((sum, r) => sum + r.metrics.responseTime, 0);
    const modelsUsed = Array.from(new Set(results.map(r => r.model)));

    return {
      totalScenarios: results.length,
      passedScenarios: passed,
      failedScenarios: failed,
      skippedScenarios: 0, // TODO: Track skipped scenarios
      successRate: results.length > 0 ? passed / results.length : 0,
      totalDuration,
      averageResponseTime: results.length > 0 ? totalResponseTime / results.length : 0,
      totalToolCalls,
      modelsTested: modelsUsed,
    };
  }
}