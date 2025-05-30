#!/usr/bin/env node

/**
 * Quick-MCP Test CLI
 * LLM-powered testing tool for Quick-MCP servers
 */

import chalk from 'chalk';
import { program } from 'commander';
import ora from 'ora';

import { verifyProvider } from './provider-verification.ts';
import { createReporter } from './reporter.ts';
import { loadScenarios } from './scenario-parser.ts';
import { TestRunner } from './test-runner.ts';
import type { TestConfig, CLIOptions } from './types.ts';


function main(): void {
  // Suppress Node.js experimental warnings for cleaner output
  process.env['NODE_NO_WARNINGS'] = '1';
  
  program
    .name('quick-mcp-test')
    .description('LLM-powered testing tool for Quick-MCP servers')
    .version('0.1.0');

  // Main test command
  program
    .command('test', { isDefault: true })
    .description('Run LLM-powered tests against Quick-MCP servers')
    .requiredOption('-s, --spec <url>', 'OpenAPI specification URL or file path')
    .option('-m, --model <model>', 'Model to test with (e.g., gpt-4o-mini, localhost:1234)', 'gpt-4o-mini')
    .option('--models <models>', 'Comma-separated list of models to test with')
    .option('--scenarios <file>', 'YAML file with test scenarios (or "basic", "comprehensive")')
    .option('--server-url <url>', 'Quick-MCP server URL (if not starting own server)')
    .option('--timeout <ms>', 'Test timeout in milliseconds', '30000')
    .option('--retries <count>', 'Number of retries for failed tests', '1')
    .option('--parallel', 'Run scenarios in parallel', false)
    .option('--verbose', 'Verbose output', false)
    .option('--format <format>', 'Output format (console, json, html)', 'console')
    .option('--output <file>', 'Output file for results')
    .action(async (options: CLIOptions) => {
      try {
        await runTests(options);
      } catch (error) {
        console.error(chalk.red('❌ Test execution failed:'));
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  // Provider verification command
  program
    .command('verify-provider')
    .description('Verify optimal provider setup for a model')
    .argument('<model>', 'Model name to verify (e.g., ollama:mistral, gpt-4o-mini)')
    .action(async (model: string) => {
      await verifyProvider(model);
    });

  program.parse();
}

async function runTests(options: CLIOptions): Promise<void> {
  const spinner = ora('Initializing Quick-MCP Test...').start();

  try {
    // Parse models
    const models = options.models 
      ? options.models.split(',').map(m => m.trim())
      : [options.model ?? 'gpt-4o-mini'];

    // Load scenarios
    spinner.text = 'Loading test scenarios...';
    const scenarios = await loadScenarios(options.scenarios);

    // Create test configuration
    const config: TestConfig = {
      spec: options.spec,
      models,
      scenarios,
      ...(options.serverUrl !== undefined && { serverUrl: options.serverUrl }),
      options: {
        timeout: parseInt(options.timeout ?? '30000'),
        retries: parseInt(options.retries ?? '1'),
        ...(options.parallel !== undefined && { parallel: options.parallel }),
        ...(options.verbose !== undefined && { verbose: options.verbose }),
        ...(options.format !== undefined && { format: options.format as 'console' | 'json' | 'html' }),
      },
    };

    spinner.text = 'Starting Quick-MCP server...';
    
    // Initialize test runner
    const testRunner = new TestRunner(config);
    await testRunner.initialize();

    spinner.succeed('Initialization complete');

    // Display test plan
    console.log(chalk.cyan('📋 Test Plan:'));
    console.log(`  • Spec: ${chalk.white(config.spec)}`);
    console.log(`  • Models: ${chalk.white(models.join(', '))}`);
    console.log(`  • Scenarios: ${chalk.white(scenarios.length)}`);
    console.log(`  • Format: ${chalk.white(config.options?.format ?? 'console')}`);
    console.log();

    // Run tests
    const testSpinner = ora('Running tests...').start();
    const results = await testRunner.run();
    testSpinner.succeed('Tests completed');

    // Generate report
    const reporter = createReporter(config.options?.format ?? 'console');
    await reporter.generateReport(results, options.output);

    // Exit with appropriate code
    const exitCode = results.summary.failedScenarios > 0 ? 1 : 0;
    process.exit(exitCode);

  } catch (error) {
    spinner.fail('Initialization failed');
    throw error;
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n🛑 Test execution interrupted'));
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\n🛑 Test execution terminated'));
  process.exit(1);
});

if (import.meta.url === `file://${process.argv[1] ?? ''}`) {
  try {
    main();
  } catch (error: unknown) {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  }
}

export { main };