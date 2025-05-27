/**
 * State Management Pattern for Multi-Step Test Scenarios
 * Provides context preservation across test steps
 */

import type { TestScenario, ToolCall } from '../types.ts';

export interface TestContext {
  scenario: TestScenario;
  model: string;
  previousSteps: StepResult[];
  sharedData: Map<string, unknown>;
  toolCallHistory: ToolCall[];
}

export interface StepResult {
  prompt: string;
  response: string;
  toolCalls: ToolCall[];
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export class TestStateManager {
  private contexts = new Map<string, TestContext>();

  createContext(scenario: TestScenario, model: string): TestContext {
    const contextId = `${scenario.name}-${model}`;
    
    const context: TestContext = {
      scenario,
      model,
      previousSteps: [],
      sharedData: new Map(),
      toolCallHistory: []
    };

    this.contexts.set(contextId, context);
    return context;
  }

  getContext(scenario: TestScenario, model: string): TestContext | undefined {
    const contextId = `${scenario.name}-${model}`;
    return this.contexts.get(contextId);
  }

  updateContext(
    scenario: TestScenario,
    model: string,
    stepResult: StepResult
  ): void {
    const context = this.getContext(scenario, model);
    if (!context) {
      throw new Error(`Context not found for ${scenario.name}-${model}`);
    }

    context.previousSteps.push(stepResult);
    context.toolCallHistory.push(...stepResult.toolCalls);
  }

  // Helper for building context-aware prompts
  buildContextualPrompt(context: TestContext, basePrompt: string): string {
    if (context.previousSteps.length === 0) {
      return basePrompt;
    }

    const history = context.previousSteps
      .map(step => `Previous: ${step.prompt}\nResponse: ${step.response}`)
      .join('\n\n');

    return `${history}\n\nNow: ${basePrompt}`;
  }

  // Extract and store reusable data from responses
  extractSharedData(
    context: TestContext,
    key: string,
    value: unknown
  ): void {
    context.sharedData.set(key, value);
  }

  // Interpolate shared data into prompts
  interpolatePrompt(context: TestContext, prompt: string): string {
    let interpolated = prompt;
    
    for (const [key, value] of context.sharedData) {
      const placeholder = `{{${key}}}`;
      if (interpolated.includes(placeholder)) {
        interpolated = interpolated.replace(
          new RegExp(placeholder, 'g'),
          String(value)
        );
      }
    }

    return interpolated;
  }

  clearContext(scenario: TestScenario, model: string): void {
    const contextId = `${scenario.name}-${model}`;
    this.contexts.delete(contextId);
  }

  clearAll(): void {
    this.contexts.clear();
  }
}