/**
 * Enhanced Scenario Framework with Composition and Dynamic Data
 */

import type { TestScenario, TestAssertion } from '../types.ts';

export interface EnhancedScenario extends TestScenario {
  // Composition support
  extends?: string;
  steps?: ScenarioStep[];
  
  // Dynamic data
  variables?: Record<string, VariableDefinition>;
  fixtures?: string[];
  
  // Advanced features
  tags?: string[];
  retries?: number;
  parallel?: boolean;
}

export interface ScenarioStep {
  name: string;
  prompt: string;
  expect?: TestAssertion[];
  extractData?: Record<string, string>; // key: JSONPath expression
  condition?: string; // Skip condition expression
}

export interface VariableDefinition {
  type: 'static' | 'dynamic' | 'environment';
  value?: unknown;
  generator?: () => unknown;
  default?: unknown;
}

export class ScenarioComposer {
  private baseScenarios = new Map<string, EnhancedScenario>();
  private variables = new Map<string, unknown>();

  registerBaseScenario(name: string, scenario: EnhancedScenario): void {
    this.baseScenarios.set(name, scenario);
  }

  compose(scenario: EnhancedScenario): TestScenario[] {
    // Handle inheritance
    if (scenario.extends) {
      const base = this.baseScenarios.get(scenario.extends);
      if (!base) {
        throw new Error(`Base scenario "${scenario.extends}" not found`);
      }
      scenario = this.mergeScenarios(base, scenario);
    }

    // Process variables
    this.processVariables(scenario);

    // If multi-step, create individual scenarios
    if (scenario.steps && scenario.steps.length > 0) {
      return this.expandSteps(scenario);
    }

    // Single scenario
    return [this.interpolateScenario(scenario)];
  }

  private mergeScenarios(
    base: EnhancedScenario,
    override: EnhancedScenario
  ): EnhancedScenario {
    return {
      ...base,
      ...override,
      expect: [...(base.expect || []), ...(override.expect || [])],
      variables: { ...base.variables, ...override.variables },
      tags: [...(base.tags ?? []), ...(override.tags ?? [])]
    };
  }

  private processVariables(scenario: EnhancedScenario): void {
    if (!scenario.variables) return;

    for (const [key, def] of Object.entries(scenario.variables)) {
      let value: unknown;

      switch (def.type) {
        case 'static':
          value = def.value ?? def.default;
          break;
        
        case 'dynamic':
          value = def.generator ? def.generator() : def.default;
          break;
        
        case 'environment':
          value = process.env[key] ?? def.default;
          break;
      }

      this.variables.set(key, value);
    }
  }

  private expandSteps(scenario: EnhancedScenario): TestScenario[] {
    if (!scenario.steps) return [];

    return scenario.steps.map((step, index) => ({
      name: `${scenario.name} - Step ${index + 1}: ${step.name}`,
      prompt: this.interpolateString(step.prompt),
      expect: step.expect || scenario.expect || [],
      timeout: scenario.timeout,
      skip: scenario.skip ?? this.evaluateCondition(step.condition)
    }));
  }

  private interpolateScenario(scenario: EnhancedScenario): TestScenario {
    return {
      ...scenario,
      prompt: this.interpolateString(scenario.prompt),
      expect: scenario.expect || []
    };
  }

  private interpolateString(template: string): string {
    let result = template;

    // Replace variables
    for (const [key, value] of this.variables) {
      const placeholder = `\${${key}}`;
      if (result.includes(placeholder)) {
        result = result.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          String(value)
        );
      }
    }

    // Replace dynamic expressions
    result = result.replace(/\${timestamp}/g, Date.now().toString());
    result = result.replace(/\${uuid}/g, this.generateUUID());
    result = result.replace(/\${random\((\d+),(\d+)\)}/g, (_match: string, min: string, max: string) => {
      const minNum = parseInt(min);
      const maxNum = parseInt(max);
      return Math.floor(Math.random() * (maxNum - minNum + 1) + minNum).toString();
    });

    return result;
  }

  private evaluateCondition(condition?: string): boolean {
    if (!condition) return false;

    // Simple condition evaluation (can be enhanced)
    try {
      // Replace variables in condition
      let evaluableCondition = condition;
      for (const [key, value] of this.variables) {
        evaluableCondition = evaluableCondition.replace(
          new RegExp(`\\b${key}\\b`, 'g'),
          JSON.stringify(value)
        );
      }

      // Safely evaluate simple conditions
      const match = /^[a-zA-Z0-9_\s=!<>"']+$/.exec(evaluableCondition);
      if (match) {
        // Simple safe evaluation for basic comparisons only
        // This is intentionally limited to avoid code injection
        if (evaluableCondition.includes('true')) return true;
        if (evaluableCondition.includes('false')) return false;
        return false;
      }
    } catch {
      // Invalid condition, don't skip
    }

    return false;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// Example enhanced scenario
export const ENHANCED_SCENARIO_EXAMPLE: EnhancedScenario = {
  name: "User Management Flow",
  prompt: "Execute user management workflow",
  expect: [],
  extends: "base-crud-test",
  
  variables: {
    testUser: {
      type: 'dynamic',
      generator: () => `test-user-${Date.now()}`
    },
    apiKey: {
      type: 'environment',
      default: 'test-key'
    }
  },

  steps: [
    {
      name: "Create User",
      prompt: "Create a new user with username ${testUser}",
      expect: [
        { type: 'tool_call', value: 'createUser' },
        { type: 'response_contains', value: ['created', 'success'] }
      ],
      extractData: {
        userId: "$.data.id"
      }
    },
    {
      name: "Verify User",
      prompt: "Get the user with ID {{userId}} and verify the username",
      expect: [
        { type: 'tool_call', value: 'getUser' },
        { type: 'response_contains', value: ['${testUser}'] }
      ]
    },
    {
      name: "Cleanup",
      prompt: "Delete the user with ID {{userId}}",
      expect: [
        { type: 'tool_call', value: 'deleteUser' },
        { type: 'no_errors', value: true }
      ],
      condition: "!skipCleanup"
    }
  ],

  tags: ['user-management', 'crud', 'integration'],
  timeout: 30000
};