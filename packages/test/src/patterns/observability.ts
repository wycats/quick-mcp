/**
 * Observability Pattern for LLM Testing
 * Provides insights into LLM decision-making and performance
 */

import type { TestResult } from '../types.ts';

export interface ObservabilityEvent {
  timestamp: Date;
  type: 'tool_selection' | 'reasoning' | 'performance' | 'error';
  model: string;
  scenario: string;
  data: Record<string, unknown>;
}

export interface PerformanceMetrics {
  llmThinkingTime: number;
  toolExecutionTime: number;
  totalTime: number;
  tokensUsed?: number;
  costEstimate?: number;
}

export class ObservabilityManager {
  private events: ObservabilityEvent[] = [];
  private listeners = new Map<string, Set<(event: ObservabilityEvent) => void>>();

  emit(event: Omit<ObservabilityEvent, 'timestamp'>): void {
    const fullEvent: ObservabilityEvent = {
      ...event,
      timestamp: new Date()
    };

    this.events.push(fullEvent);
    this.notifyListeners(fullEvent);
  }

  on(type: ObservabilityEvent['type'], handler: (event: ObservabilityEvent) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)?.add(handler);
  }

  off(type: ObservabilityEvent['type'], handler: (event: ObservabilityEvent) => void): void {
    this.listeners.get(type)?.delete(handler);
  }

  private notifyListeners(event: ObservabilityEvent): void {
    const handlers = this.listeners.get(event.type);
    if (handlers) {
      handlers.forEach(handler => { handler(event); });
    }
  }

  // Analyze tool selection patterns
  analyzeToolSelectionPatterns(model: string): Record<string, number> {
    const toolCounts: Record<string, number> = {};
    
    this.events
      .filter(e => e.type === 'tool_selection' && e.model === model)
      .forEach(event => {
        const toolName = event.data.toolName as string;
        toolCounts[toolName] = (toolCounts[toolName] ?? 0) + 1;
      });

    return toolCounts;
  }

  // Calculate performance breakdown
  calculatePerformanceBreakdown(result: TestResult): PerformanceMetrics {
    const toolTimes = result.toolCalls.map(tc => tc.duration);
    const toolExecutionTime = toolTimes.reduce((sum, time) => sum + time, 0);
    const llmThinkingTime = result.metrics.responseTime - toolExecutionTime;

    return {
      llmThinkingTime: Math.max(0, llmThinkingTime),
      toolExecutionTime,
      totalTime: result.metrics.duration,
      tokensUsed: result.metrics.tokensUsed,
      costEstimate: this.estimateCost(result.model, result.metrics.tokensUsed)
    };
  }

  private estimateCost(model: string, tokens?: number): number | undefined {
    if (!tokens) return undefined;

    // Rough cost estimates per 1K tokens (in cents)
    const costPerKTokens: Record<string, number> = {
      'gpt-4o': 0.5,
      'gpt-4o-mini': 0.015,
      'claude-3-5-sonnet': 0.3,
      'claude-3-haiku': 0.025,
    };

    const baseCost = costPerKTokens[model] ?? 0.1;
    return (tokens / 1000) * baseCost;
  }

  // Generate insights report
  generateInsights(): string {
    const modelPerformance = new Map<string, PerformanceMetrics[]>();
    const errorRates = new Map<string, number>();

    // Aggregate data by model
    this.events.forEach(event => {
      if (event.type === 'performance') {
        const metrics = event.data as PerformanceMetrics;
        if (!modelPerformance.has(event.model)) {
          modelPerformance.set(event.model, []);
        }
        modelPerformance.get(event.model)?.push(metrics);
      }

      if (event.type === 'error') {
        errorRates.set(event.model, (errorRates.get(event.model) ?? 0) + 1);
      }
    });

    // Build insights
    let insights = '## LLM Testing Insights\n\n';

    modelPerformance.forEach((metrics, model) => {
      const avgThinkingTime = metrics.reduce((sum, m) => sum + m.llmThinkingTime, 0) / metrics.length;
      const avgToolTime = metrics.reduce((sum, m) => sum + m.toolExecutionTime, 0) / metrics.length;
      const totalCost = metrics.reduce((sum, m) => sum + (m.costEstimate ?? 0), 0);
      const errorRate = (errorRates.get(model) ?? 0) / metrics.length;

      insights += `### ${model}\n`;
      insights += `- Avg Thinking Time: ${avgThinkingTime.toFixed(0)}ms\n`;
      insights += `- Avg Tool Execution: ${avgToolTime.toFixed(0)}ms\n`;
      insights += `- Error Rate: ${(errorRate * 100).toFixed(1)}%\n`;
      insights += `- Estimated Cost: $${totalCost.toFixed(3)}\n\n`;
    });

    return insights;
  }

  clear(): void {
    this.events = [];
  }
}