/**
 * Test Result Reporter
 * Generates reports in various formats (console, JSON, HTML)
 */

import { writeFile } from 'fs/promises';

import chalk from 'chalk';
import { table } from 'table';

import type { TestSuite } from './types.ts';

export interface Reporter {
  generateReport(testSuite: TestSuite, outputFile?: string): Promise<void>;
}

/**
 * Create reporter based on format
 */
export function createReporter(format: 'console' | 'json' | 'html'): Reporter {
  switch (format) {
    case 'console':
      return new ConsoleReporter();
    case 'json':
      return new JSONReporter();
    case 'html':
      return new HTMLReporter();
    default:
      throw new Error(`Unknown report format: ${String(format)}`);
  }
}

/**
 * Console Reporter - outputs to stdout
 */
class ConsoleReporter implements Reporter {
  async generateReport(testSuite: TestSuite, outputFile?: string): Promise<void> {
    const { summary, results } = testSuite;

    console.log();
    console.log(chalk.cyan('📊 Test Results Summary'));
    console.log(chalk.cyan('='.repeat(50)));

    // Summary table
    const summaryData = [
      ['Metric', 'Value'],
      ['Total Scenarios', summary.totalScenarios.toString()],
      ['Passed', chalk.green(summary.passedScenarios.toString())],
      ['Failed', summary.failedScenarios > 0 ? chalk.red(summary.failedScenarios.toString()) : '0'],
      ['Success Rate', `${(summary.successRate * 100).toFixed(1)}%`],
      ['Total Duration', `${(summary.totalDuration / 1000).toFixed(2)}s`],
      ['Avg Response Time', `${summary.averageResponseTime.toFixed(0)}ms`],
      ['Total Tool Calls', summary.totalToolCalls.toString()],
      ['Models Tested', summary.modelsTested.join(', ')],
    ];

    console.log(table(summaryData, {
      header: {
        alignment: 'center',
        content: chalk.bold('Test Summary'),
      },
    }));

    // Detailed results
    if (results.length > 0) {
      console.log(chalk.cyan('📋 Detailed Results'));
      console.log(chalk.cyan('-'.repeat(50)));

      const resultData = [
        ['Scenario', 'Model', 'Status', 'Duration', 'Tools', 'Quality'],
      ];

      for (const result of results) {
        const status = result.success 
          ? chalk.green('✅ PASS') 
          : chalk.red('❌ FAIL');
        
        const duration = `${result.metrics.duration}ms`;
        const toolCount = result.toolCalls.length.toString();
        const quality = result.metrics.qualityScore 
          ? `${(result.metrics.qualityScore * 100).toFixed(0)}%`
          : 'N/A';

        resultData.push([
          result.scenario.name,
          result.model,
          status,
          duration,
          toolCount,
          quality,
        ]);
      }

      console.log(table(resultData));
    }

    // Failed tests details
    const failedTests = results.filter(r => !r.success);
    if (failedTests.length > 0) {
      console.log(chalk.red('❌ Failed Tests Details'));
      console.log(chalk.red('-'.repeat(50)));

      for (const test of failedTests) {
        console.log(chalk.red(`\n🔸 ${test.scenario.name} (${test.model})`));
        
        if (test.error) {
          console.log(chalk.red(`   Error: ${test.error.message}`));
        }

        const failedAssertions = test.assertions.filter(a => !a.passed);
        if (failedAssertions.length > 0) {
          console.log(chalk.red(`   Failed Assertions:`));
          for (const assertion of failedAssertions) {
            console.log(chalk.red(`     • ${assertion.assertion.type}: ${assertion.message ?? 'failed'}`));
          }
        }

        if (test.response) {
          const preview = test.response.substring(0, 200);
          console.log(chalk.dim(`   Response: ${preview}${test.response.length > 200 ? '...' : ''}`));
        }
      }
    }

    // Save to file if requested
    if (outputFile) {
      const report = this.#generateTextReport(testSuite);
      await writeFile(outputFile, report);
      console.log(chalk.dim(`\n📄 Report saved to: ${outputFile}`));
    }
  }

  #generateTextReport(testSuite: TestSuite): string {
    const { summary, results } = testSuite;
    const lines = [];

    lines.push('Quick-MCP Test Report');
    lines.push('='.repeat(50));
    lines.push(`Generated: ${testSuite.timestamp.toISOString()}`);
    lines.push(`Spec: ${testSuite.config.spec}`);
    lines.push('');

    lines.push('Summary:');
    lines.push(`  Total Scenarios: ${summary.totalScenarios}`);
    lines.push(`  Passed: ${summary.passedScenarios}`);
    lines.push(`  Failed: ${summary.failedScenarios}`);
    lines.push(`  Success Rate: ${(summary.successRate * 100).toFixed(1)}%`);
    lines.push(`  Total Duration: ${(summary.totalDuration / 1000).toFixed(2)}s`);
    lines.push(`  Average Response Time: ${summary.averageResponseTime.toFixed(0)}ms`);
    lines.push(`  Total Tool Calls: ${summary.totalToolCalls}`);
    lines.push(`  Models Tested: ${summary.modelsTested.join(', ')}`);
    lines.push('');

    lines.push('Detailed Results:');
    for (const result of results) {
      lines.push(`  ${result.scenario.name} (${result.model}): ${result.success ? 'PASS' : 'FAIL'}`);
      if (!result.success && result.error) {
        lines.push(`    Error: ${result.error.message}`);
      }
    }

    return lines.join('\n');
  }
}

/**
 * JSON Reporter - outputs structured JSON
 */
class JSONReporter implements Reporter {
  async generateReport(testSuite: TestSuite, outputFile?: string): Promise<void> {
    const report = {
      metadata: {
        version: '0.1.0',
        timestamp: testSuite.timestamp.toISOString(),
        spec: testSuite.config.spec,
        models: testSuite.config.models,
      },
      summary: testSuite.summary,
      results: testSuite.results.map(result => ({
        scenario: result.scenario.name,
        model: result.model,
        success: result.success,
        response: result.response,
        toolCalls: result.toolCalls,
        metrics: result.metrics,
        assertions: result.assertions,
        error: result.error?.message,
        timestamp: result.timestamp.toISOString(),
      })),
    };

    const json = JSON.stringify(report, null, 2);

    if (outputFile) {
      await writeFile(outputFile, json);
      console.log(chalk.green(`📄 JSON report saved to: ${outputFile}`));
    } else {
      console.log(json);
    }
  }
}

/**
 * HTML Reporter - generates HTML report
 */
class HTMLReporter implements Reporter {
  async generateReport(testSuite: TestSuite, outputFile?: string): Promise<void> {
    const html = this.#generateHTML(testSuite);

    if (outputFile) {
      await writeFile(outputFile, html);
      console.log(chalk.green(`📄 HTML report saved to: ${outputFile}`));
    } else {
      console.log(html);
    }
  }

  #generateHTML(testSuite: TestSuite): string {
    const { summary, results } = testSuite;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quick-MCP Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .metric { background: white; padding: 15px; border-radius: 6px; border: 1px solid #e1e5e9; }
        .metric-value { font-size: 24px; font-weight: bold; color: #0969da; }
        .metric-label { color: #656d76; font-size: 14px; }
        .results { margin-top: 30px; }
        .result { background: white; border: 1px solid #e1e5e9; border-radius: 6px; margin-bottom: 10px; padding: 15px; }
        .result.pass { border-left: 4px solid #1a7f37; }
        .result.fail { border-left: 4px solid #d1242f; }
        .result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .result-title { font-weight: bold; }
        .result-status { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .status-pass { background: #dafbe1; color: #1a7f37; }
        .status-fail { background: #ffebe9; color: #d1242f; }
        .result-details { font-size: 14px; color: #656d76; }
        .tools { margin-top: 8px; }
        .tool { display: inline-block; background: #f6f8fa; padding: 2px 6px; border-radius: 3px; margin-right: 5px; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Quick-MCP Test Report</h1>
        <p>Generated: ${testSuite.timestamp.toISOString()}</p>
        <p>Spec: ${testSuite.config.spec}</p>
        <p>Models: ${testSuite.config.models.join(', ')}</p>
    </div>

    <div class="summary">
        <div class="metric">
            <div class="metric-value">${summary.totalScenarios}</div>
            <div class="metric-label">Total Scenarios</div>
        </div>
        <div class="metric">
            <div class="metric-value" style="color: #1a7f37">${summary.passedScenarios}</div>
            <div class="metric-label">Passed</div>
        </div>
        <div class="metric">
            <div class="metric-value" style="color: #d1242f">${summary.failedScenarios}</div>
            <div class="metric-label">Failed</div>
        </div>
        <div class="metric">
            <div class="metric-value">${(summary.successRate * 100).toFixed(1)}%</div>
            <div class="metric-label">Success Rate</div>
        </div>
        <div class="metric">
            <div class="metric-value">${(summary.totalDuration / 1000).toFixed(1)}s</div>
            <div class="metric-label">Total Duration</div>
        </div>
        <div class="metric">
            <div class="metric-value">${summary.averageResponseTime.toFixed(0)}ms</div>
            <div class="metric-label">Avg Response Time</div>
        </div>
    </div>

    <div class="results">
        <h2>Test Results</h2>
        ${results.map(result => `
            <div class="result ${result.success ? 'pass' : 'fail'}">
                <div class="result-header">
                    <div class="result-title">${result.scenario.name} (${result.model})</div>
                    <div class="result-status ${result.success ? 'status-pass' : 'status-fail'}">
                        ${result.success ? 'PASS' : 'FAIL'}
                    </div>
                </div>
                <div class="result-details">
                    Duration: ${result.metrics.duration}ms | 
                    Tool Calls: ${result.toolCalls.length} |
                    Quality: ${result.metrics.qualityScore ? `${(result.metrics.qualityScore * 100).toFixed(0)}%` : 'N/A'}
                </div>
                ${result.toolCalls.length > 0 ? `
                    <div class="tools">
                        ${result.toolCalls.map(tool => `<span class="tool">${tool.name}</span>`).join('')}
                    </div>
                ` : ''}
                ${result.error ? `<div style="color: #d1242f; margin-top: 8px;">Error: ${result.error.message}</div>` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>`;
  }
}