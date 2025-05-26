/**
 * Operation statistics and monitoring for Quick-MCP
 */


import type { OpenApiSpec } from '../openapi.ts';

/**
 * Statistics about exposed tools for logging
 */
export interface SafetyStats {
  readonly readonly: number;
  readonly update: number;
  readonly idempotent: number;
  readonly destructive: number;
}

/**
 * Class for collecting and analyzing operation statistics
 */
export class OperationStatistics {
  readonly #spec: OpenApiSpec;

  constructor(spec: OpenApiSpec) {
    this.#spec = spec;
  }

  /**
   * Get safety statistics for all exposed tools
   */
  getSafetyStats(): SafetyStats {
    const tools = this.#spec.getTools();
    let readonlyCount = 0;
    let updateCount = 0;
    let idempotentCount = 0;
    let destructiveCount = 0;

    tools.forEach(tool => {
      const operation = this.#spec.getOperation(tool.name);
      if (operation) {
        const hints = operation.verb.hints;
        if (hints.readOnlyHint) readonlyCount++;
        if (!hints.readOnlyHint && !hints.destructiveHint) updateCount++;
        if (hints.idempotentHint) idempotentCount++;
        if (hints.destructiveHint) destructiveCount++;
      }
    });

    return {
      readonly: readonlyCount,
      update: updateCount,
      idempotent: idempotentCount,
      destructive: destructiveCount,
    };
  }

  /**
   * Get count of tools by type
   */
  getToolCounts(): { readonly tools: number; readonly resources: number } {
    return {
      tools: this.#spec.getTools().length,
      resources: this.#spec.getResources().length,
    };
  }

  /**
   * Get detailed operation metrics
   */
  getOperationMetrics(): {
    readonly total: number;
    readonly byMethod: Record<string, number>;
  } {
    const tools = this.#spec.getTools();
    const resources = this.#spec.getResources();
    const byMethod: Record<string, number> = {};

    // Count tools by method
    tools.forEach(tool => {
      const method = tool.verb.uppercase;
      byMethod[method] = (byMethod[method] ?? 0) + 1;
    });

    // Count resources by method (typically GET)
    resources.forEach(resource => {
      const method = resource.verb.uppercase;
      byMethod[method] = (byMethod[method] ?? 0) + 1;
    });

    return {
      total: tools.length + resources.length,
      byMethod: { ...byMethod }, // Create a new object to ensure immutability
    };
  }
}