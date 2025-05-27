/**
 * Enhanced Error Handling Pattern for @quick-mcp/test
 * Provides structured error categorization and recovery strategies
 */

export enum ErrorCategory {
  TOOL_EXECUTION = 'TOOL_EXECUTION',
  LLM_REASONING = 'LLM_REASONING',
  NETWORK_FAILURE = 'NETWORK_FAILURE',
  RATE_LIMIT = 'RATE_LIMIT',
  ASSERTION_FAILURE = 'ASSERTION_FAILURE',
  CONFIGURATION = 'CONFIGURATION',
  UNKNOWN = 'UNKNOWN'
}

export interface StructuredError extends Error {
  category: ErrorCategory;
  retryable: boolean;
  context: Record<string, unknown>;
  recovery?: () => Promise<void>;
}

export const ErrorHandler = {
  ERROR_PATTERNS: new Map<RegExp, ErrorCategory>([
    [/rate limit/i, ErrorCategory.RATE_LIMIT],
    [/tool.*not found/i, ErrorCategory.TOOL_EXECUTION],
    [/network|timeout|ECONNREFUSED/i, ErrorCategory.NETWORK_FAILURE],
    [/assertion.*failed/i, ErrorCategory.ASSERTION_FAILURE],
    [/invalid.*config/i, ErrorCategory.CONFIGURATION],
  ]),

  categorize(error: Error, context?: Record<string, unknown>): StructuredError {
    const category = this.detectCategory(error);
    const retryable = this.isRetryable(category);
    
    return Object.assign(error, {
      category,
      retryable,
      context: context ?? {},
      recovery: this.getRecoveryStrategy(category)
    });
  },

  detectCategory(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    
    for (const [pattern, category] of ErrorHandler.ERROR_PATTERNS) {
      if (pattern.test(message)) {
        return category;
      }
    }
    
    return ErrorCategory.UNKNOWN;
  },

  isRetryable(category: ErrorCategory): boolean {
    return [
      ErrorCategory.NETWORK_FAILURE,
      ErrorCategory.RATE_LIMIT,
      ErrorCategory.TOOL_EXECUTION
    ].includes(category);
  },

  getRecoveryStrategy(category: ErrorCategory): (() => Promise<void>) | undefined {
    switch (category) {
      case ErrorCategory.RATE_LIMIT:
        return async () => {
          const delay = Math.random() * 5000 + 5000; // 5-10s
          await new Promise(resolve => setTimeout(resolve, delay));
        };
      
      case ErrorCategory.NETWORK_FAILURE:
        return async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
        };
      
      default:
        return undefined;
    }
  }
};

export class RetryStrategy {
  constructor(
    private maxAttempts = 3,
    private backoffMultiplier = 2,
    private maxDelay = 30000
  ) {}

  async execute<T>(
    operation: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T> {
    let lastError: StructuredError | undefined;
    let delay = 1000;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = ErrorHandler.categorize(error as Error, {
          ...context,
          attempt,
          delay
        });

        if (!lastError.retryable || attempt === this.maxAttempts) {
          throw lastError;
        }

        if (lastError.recovery) {
          await lastError.recovery();
        } else {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        delay = Math.min(delay * this.backoffMultiplier, this.maxDelay);
      }
    }

    throw lastError ?? new Error('Operation failed after retries');
  }
}