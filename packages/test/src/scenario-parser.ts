/**
 * Test Scenario Parser
 * Loads and validates test scenarios from YAML files or built-in templates
 */

import { readFile } from 'fs/promises';

import { parse as parseYAML } from 'yaml';

import type { TestScenario, TestAssertion } from './types.ts';

/**
 * Load test scenarios from file or built-in templates
 */
export async function loadScenarios(scenariosInput?: string): Promise<TestScenario[]> {
  if (!scenariosInput) {
    return getDefaultScenarios();
  }

  // Built-in scenario templates
  if (scenariosInput === 'basic') {
    return getBasicScenarios();
  }

  if (scenariosInput === 'comprehensive') {
    return getComprehensiveScenarios();
  }

  // Load from file
  try {
    const content = await readFile(scenariosInput, 'utf-8');
    const parsed = parseYAML(content) as { scenarios?: unknown[] };
    
    if (!parsed || typeof parsed !== 'object' || !('scenarios' in parsed) || !Array.isArray(parsed.scenarios)) {
      throw new Error('Invalid scenario file format: expected { scenarios: [...] }');
    }

    return validateScenarios(parsed.scenarios);
  } catch (error) {
    throw new Error(`Failed to load scenarios from ${scenariosInput}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validate scenario format
 */
function validateScenarios(scenarios: unknown[]): TestScenario[] {
  return scenarios.map((scenario, index) => {
    if (typeof scenario !== 'object' || scenario === null) {
      throw new Error(`Scenario ${index} must be an object`);
    }

    const s = scenario as Record<string, unknown>;

    if (typeof s.name !== 'string') {
      throw new Error(`Scenario ${index} must have a string 'name' field`);
    }

    if (typeof s.prompt !== 'string') {
      throw new Error(`Scenario ${index} must have a string 'prompt' field`);
    }

    const expect = s.expect as unknown[];
    if (!Array.isArray(expect)) {
      throw new Error(`Scenario ${index} must have an array 'expect' field`);
    }

    return {
      name: s.name,
      prompt: s.prompt,
      expect: validateAssertions(expect, index),
      timeout: typeof s.timeout === 'number' ? s.timeout : undefined,
      skip: typeof s.skip === 'boolean' ? s.skip : false,
    };
  });
}

/**
 * Validate assertions format
 */
function validateAssertions(assertions: unknown[], scenarioIndex: number): TestAssertion[] {
  return assertions.map((assertion, index) => {
    if (typeof assertion !== 'object' || assertion === null) {
      throw new Error(`Assertion ${index} in scenario ${scenarioIndex} must be an object`);
    }

    const a = assertion as Record<string, unknown>;
    
    // Handle shorthand formats
    if ('tool_call' in a || 'calls_tool' in a) {
      return {
        type: 'tool_call',
        value: a.tool_call ?? a.calls_tool,
      };
    }

    if ('response_contains' in a || 'contains' in a) {
      return {
        type: 'response_contains',
        value: a.response_contains ?? a.contains,
      };
    }

    if ('tool_count' in a) {
      const value = a.tool_count as string;
      const match = /^(>=|<=|>|<|=)\s*(\d+)$/.exec(value);
      if (!match) {
        throw new Error(`Invalid tool_count format: ${value}. Use format like ">= 3"`);
      }
      return {
        type: 'tool_count',
        operator: match[1] as '>' | '>=' | '<' | '<=' | '=',
        value: parseInt(match[2]),
      };
    }

    if ('response_time' in a) {
      const value = a.response_time as string;
      const match = /^(<|<=)\s*(\d+)(s|ms)$/.exec(value);
      if (!match) {
        throw new Error(`Invalid response_time format: ${value}. Use format like "< 2s"`);
      }
      const time = parseInt(match[2]) * (match[3] === 's' ? 1000 : 1);
      return {
        type: 'response_time',
        operator: match[1] as '<' | '<=',
        value: time,
      };
    }

    if ('no_errors' in a) {
      return {
        type: 'no_errors',
        value: true,
      };
    }

    throw new Error(`Unknown assertion type in scenario ${scenarioIndex}, assertion ${index}`);
  });
}

/**
 * Default scenarios for basic testing
 */
function getDefaultScenarios(): TestScenario[] {
  return [
    {
      name: 'Tool Discovery',
      prompt: 'What tools are available? List them for me.',
      expect: [
        { type: 'tool_call', value: 'list_tools' },
        { type: 'tool_count', operator: '>=', value: 1 },
      ],
    },
    {
      name: 'Basic Interaction',
      prompt: 'Help me understand what this API can do.',
      expect: [
        { type: 'response_contains', value: ['tool', 'api', 'available'] },
        { type: 'no_errors', value: true },
      ],
    },
  ];
}

/**
 * Basic test scenarios
 */
function getBasicScenarios(): TestScenario[] {
  return [
    {
      name: 'Tool Discovery',
      prompt: 'What tools are available? Please list all the tools you can use.',
      expect: [
        { type: 'response_contains', value: ['tool', 'available'] },
        { type: 'tool_count', operator: '>=', value: 1 },
        { type: 'no_errors', value: true },
      ],
    },
    {
      name: 'Simple Tool Usage',
      prompt: 'Try using one of the available tools to show me how it works.',
      expect: [
        { type: 'tool_count', operator: '>=', value: 1 },
        { type: 'response_time', operator: '<', value: 10000 },
        { type: 'no_errors', value: true },
      ],
    },
    {
      name: 'API Understanding',
      prompt: 'Explain what this API does and what kinds of operations I can perform.',
      expect: [
        { type: 'response_contains', value: ['API', 'operation'] },
        { type: 'no_errors', value: true },
      ],
    },
  ];
}

/**
 * Comprehensive test scenarios
 */
function getComprehensiveScenarios(): TestScenario[] {
  return [
    ...getBasicScenarios(),
    {
      name: 'Resource Discovery',
      prompt: 'What resources or data can I access through this API?',
      expect: [
        { type: 'response_contains', value: ['resource', 'data'] },
        { type: 'no_errors', value: true },
      ],
    },
    {
      name: 'Error Handling',
      prompt: 'Try to access something that doesn\'t exist or use invalid parameters.',
      expect: [
        { type: 'tool_count', operator: '>=', value: 1 },
        { type: 'response_contains', value: ['error', 'not found', 'invalid'] },
      ],
    },
    {
      name: 'Complex Operation',
      prompt: 'Perform a multi-step operation using several tools in sequence.',
      expect: [
        { type: 'tool_count', operator: '>=', value: 2 },
        { type: 'response_time', operator: '<', value: 30000 },
        { type: 'no_errors', value: true },
      ],
    },
    {
      name: 'Data Validation',
      prompt: 'Get some data and validate that it has the expected structure and fields.',
      expect: [
        { type: 'tool_count', operator: '>=', value: 1 },
        { type: 'response_contains', value: ['data', 'field', 'structure'] },
        { type: 'no_errors', value: true },
      ],
    },
  ];
}