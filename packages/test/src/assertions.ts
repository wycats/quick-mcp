/**
 * Test Assertions Engine
 * Validates test results against expected outcomes
 */

import type { TestAssertion, TestResult, AssertionResult } from './types.ts';

/**
 * Run all assertions against a test result
 */
export async function runAssertions(
  assertions: TestAssertion[],
  result: TestResult,
): Promise<AssertionResult[]> {
  const assertionResults: AssertionResult[] = [];

  for (const assertion of assertions) {
    const assertionResult = await runSingleAssertion(assertion, result);
    assertionResults.push(assertionResult);
  }

  return assertionResults;
}

/**
 * Run a single assertion
 */
async function runSingleAssertion(
  assertion: TestAssertion,
  result: TestResult,
): Promise<AssertionResult> {
  try {
    switch (assertion.type) {
      case 'tool_call':
        return checkToolCall(assertion, result);
      
      case 'response_contains':
        return checkResponseContains(assertion, result);
      
      case 'response_quality':
        return checkResponseQuality(assertion, result);
      
      case 'response_time':
        return checkResponseTime(assertion, result);
      
      case 'tool_count':
        return checkToolCount(assertion, result);
      
      case 'no_errors':
        return checkNoErrors(assertion, result);
      
      case 'custom':
        return await checkCustomAssertion(assertion, result);
      
      default:
        return {
          assertion,
          passed: false,
          message: `Unknown assertion type: ${String(assertion.type)}`,
        };
    }
  } catch (error) {
    return {
      assertion,
      passed: false,
      message: `Assertion error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Check if a specific tool was called
 */
function checkToolCall(assertion: TestAssertion, result: TestResult): AssertionResult {
  const expectedTool = assertion.value as string;
  const toolCalled = result.toolCalls.some(call => call.name === expectedTool);

  return {
    assertion,
    passed: toolCalled,
    actualValue: result.toolCalls.map(call => call.name),
    message: toolCalled 
      ? `Tool '${expectedTool}' was called` 
      : `Tool '${expectedTool}' was not called. Called tools: ${result.toolCalls.map(call => call.name).join(', ') || 'none'}`,
  };
}

/**
 * Check if response contains expected content
 */
function checkResponseContains(assertion: TestAssertion, result: TestResult): AssertionResult {
  const expectedContent = assertion.value;
  const response = result.response.toLowerCase();

  if (Array.isArray(expectedContent)) {
    // Check if response contains all items in array
    const missingItems = expectedContent.filter(item => 
      !response.includes(String(item).toLowerCase())
    );
    
    return {
      assertion,
      passed: missingItems.length === 0,
      actualValue: response,
      message: missingItems.length === 0
        ? `Response contains all expected content`
        : `Response missing: ${missingItems.join(', ')}`,
    };
  } else {
    // Check if response contains single item
    const contains = response.includes(String(expectedContent).toLowerCase());
    
    return {
      assertion,
      passed: contains,
      actualValue: response,
      message: contains
        ? `Response contains '${String(expectedContent)}'`
        : `Response does not contain '${String(expectedContent)}'`,
    };
  }
}

/**
 * Check response quality score
 */
function checkResponseQuality(assertion: TestAssertion, result: TestResult): AssertionResult {
  const expectedQuality = assertion.value as number;
  const actualQuality = result.metrics.qualityScore ?? 0;
  const operator = assertion.operator ?? '>=';

  const passed = compareNumbers(actualQuality, expectedQuality, operator);

  return {
    assertion,
    passed,
    actualValue: actualQuality,
    message: passed
      ? `Response quality ${actualQuality.toFixed(2)} ${operator} ${expectedQuality}`
      : `Response quality ${actualQuality.toFixed(2)} not ${operator} ${expectedQuality}`,
  };
}

/**
 * Check response time
 */
function checkResponseTime(assertion: TestAssertion, result: TestResult): AssertionResult {
  const expectedTime = assertion.value as number;
  const actualTime = result.metrics.responseTime;
  const operator = assertion.operator ?? '<=';

  const passed = compareNumbers(actualTime, expectedTime, operator);

  return {
    assertion,
    passed,
    actualValue: actualTime,
    message: passed
      ? `Response time ${actualTime}ms ${operator} ${expectedTime}ms`
      : `Response time ${actualTime}ms not ${operator} ${expectedTime}ms`,
  };
}

/**
 * Check tool call count
 */
function checkToolCount(assertion: TestAssertion, result: TestResult): AssertionResult {
  const expectedCount = assertion.value as number;
  const actualCount = result.toolCalls.length;
  const operator = assertion.operator ?? '=';

  const passed = compareNumbers(actualCount, expectedCount, operator);

  return {
    assertion,
    passed,
    actualValue: actualCount,
    message: passed
      ? `Tool count ${actualCount} ${operator} ${expectedCount}`
      : `Tool count ${actualCount} not ${operator} ${expectedCount}`,
  };
}

/**
 * Check that no errors occurred
 */
function checkNoErrors(assertion: TestAssertion, result: TestResult): AssertionResult {
  const hasErrors = result.error !== undefined || 
                   result.toolCalls.some(call => !call.success) ||
                   result.response.toLowerCase().includes('error');

  return {
    assertion,
    passed: !hasErrors,
    actualValue: hasErrors,
    message: hasErrors
      ? `Errors detected: ${result.error?.message ?? 'tool errors or error in response'}`
      : 'No errors detected',
  };
}

/**
 * Run custom assertion function
 */
async function checkCustomAssertion(assertion: TestAssertion, result: TestResult): Promise<AssertionResult> {
  if (!assertion.custom) {
    return {
      assertion,
      passed: false,
      message: 'Custom assertion function not provided',
    };
  }

  try {
    const passed = await assertion.custom(result);
    
    return {
      assertion,
      passed,
      message: passed ? 'Custom assertion passed' : 'Custom assertion failed',
    };
  } catch (error) {
    return {
      assertion,
      passed: false,
      message: `Custom assertion error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Compare numbers using operator
 */
function compareNumbers(actual: number, expected: number, operator: string): boolean {
  switch (operator) {
    case '>':
      return actual > expected;
    case '>=':
      return actual >= expected;
    case '<':
      return actual < expected;
    case '<=':
      return actual <= expected;
    case '=':
    case '==':
      return actual === expected;
    case '!=':
    case '<>':
      return actual !== expected;
    default:
      throw new Error(`Unknown comparison operator: ${operator}`);
  }
}