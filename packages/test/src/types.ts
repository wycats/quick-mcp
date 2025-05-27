/**
 * Type definitions for Quick-MCP Test
 */

export interface TestConfig {
  /** OpenAPI specification URL or file path */
  spec: string;
  /** Model name(s) to test with */
  models: string[];
  /** Test scenarios to run */
  scenarios?: string | TestScenario[];
  /** Quick-MCP server URL (if not starting own server) */
  serverUrl?: string;
  /** Environment variables for model authentication */
  env?: Record<string, string>;
  /** Test execution options */
  options?: TestOptions;
}

export interface TestOptions {
  /** Maximum time to wait for responses */
  timeout?: number;
  /** Number of retries for failed tests */
  retries?: number;
  /** Parallel execution of scenarios */
  parallel?: boolean;
  /** Verbose output */
  verbose?: boolean;
  /** Output format */
  format?: 'console' | 'json' | 'html';
}

export interface TestScenario {
  /** Unique scenario name */
  name: string;
  /** Human prompt to send to LLM */
  prompt: string;
  /** Expected outcomes and assertions */
  expect: TestAssertion[];
  /** Optional setup steps */
  setup?: TestSetup;
  /** Scenario timeout override */
  timeout?: number;
  /** Skip this scenario */
  skip?: boolean;
}

export interface TestSetup {
  /** Environment variables for this scenario */
  env?: Record<string, string>;
  /** Pre-requisite tool calls */
  prerequisites?: {
    tool: string;
    args: Record<string, unknown>;
  }[];
}

export interface TestAssertion {
  /** Type of assertion */
  type: 'tool_call' | 'response_contains' | 'response_quality' | 'response_time' | 'tool_count' | 'no_errors' | 'custom';
  /** Expected value or condition */
  value?: unknown;
  /** Comparison operator for numeric assertions */
  operator?: '>' | '>=' | '<' | '<=' | '=' | '!=';
  /** Custom assertion function */
  custom?: (result: TestResult) => boolean | Promise<boolean>;
}

export interface TestResult {
  /** Scenario that was executed */
  scenario: TestScenario;
  /** Model used for testing */
  model: string;
  /** Test execution success */
  success: boolean;
  /** LLM response */
  response: string;
  /** Tools called during execution */
  toolCalls: ToolCall[];
  /** Execution metrics */
  metrics: TestMetrics;
  /** Assertion results */
  assertions: AssertionResult[];
  /** Error if test failed */
  error?: Error;
  /** Execution timestamp */
  timestamp: Date;
}

export interface ToolCall {
  /** Tool name */
  name: string;
  /** Tool arguments */
  arguments: Record<string, unknown>;
  /** Tool response */
  response: unknown;
  /** Execution time in ms */
  duration: number;
  /** Success status */
  success: boolean;
  /** Error if tool call failed */
  error?: Error;
}

export interface TestMetrics {
  /** Total execution time in ms */
  duration: number;
  /** Response time from LLM in ms */
  responseTime: number;
  /** Number of tool calls made */
  toolCallCount: number;
  /** Total tokens used (if available) */
  tokensUsed?: number;
  /** Response quality score (0-1) */
  qualityScore?: number;
}

export interface AssertionResult {
  /** Assertion that was tested */
  assertion: TestAssertion;
  /** Assertion success */
  passed: boolean;
  /** Actual value observed */
  actualValue?: unknown;
  /** Error message if assertion failed */
  message?: string;
}

export interface TestSuite {
  /** Test configuration */
  config: TestConfig;
  /** All test results */
  results: TestResult[];
  /** Summary statistics */
  summary: TestSummary;
  /** Execution timestamp */
  timestamp: Date;
}

export interface TestSummary {
  /** Total scenarios executed */
  totalScenarios: number;
  /** Successful scenarios */
  passedScenarios: number;
  /** Failed scenarios */
  failedScenarios: number;
  /** Skipped scenarios */
  skippedScenarios: number;
  /** Success rate (0-1) */
  successRate: number;
  /** Total execution time */
  totalDuration: number;
  /** Average response time */
  averageResponseTime: number;
  /** Total tool calls made */
  totalToolCalls: number;
  /** Models tested */
  modelsTested: string[];
}

export interface ModelConfig {
  /** Model identifier */
  name: string;
  /** Model provider (openai, anthropic, local, ollama, etc.) */
  provider: 'openai' | 'anthropic' | 'local' | 'ollama' | 'custom';
  /** Model-specific configuration */
  config: Record<string, unknown>;
  /** API endpoint (for local models) */
  endpoint?: string;
  /** Authentication required */
  requiresAuth: boolean;
}

export interface MCPConnection {
  /** Server URL */
  url: string;
  /** Available tools */
  tools: MCPTool[];
  /** Available resources */
  resources: MCPResource[];
  /** Connection status */
  connected: boolean;
}

export interface MCPTool {
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
  /** Input schema */
  inputSchema: Record<string, unknown>;
  /** Tool annotations */
  annotations?: Record<string, unknown>;
}

export interface MCPResource {
  /** Resource URI */
  uri: string;
  /** Resource name */
  name: string;
  /** Resource description */
  description?: string;
  /** MIME type */
  mimeType?: string;
}

/**
 * CLI command options
 */
export interface CLIOptions {
  spec: string;
  model?: string;
  models?: string;
  scenarios?: string;
  serverUrl?: string;
  timeout?: number;
  retries?: number;
  parallel?: boolean;
  verbose?: boolean;
  format?: string;
  output?: string;
}