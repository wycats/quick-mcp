/**
 * Logging module for Quick-MCP
 * 
 * Provides logging infrastructure with LogLayer integration
 */

import { LogFileRotationTransport } from '@loglayer/transport-log-file-rotation';
import { LogLayer } from 'loglayer';
import type { ErrorSerializerType, LogLayerConfig, LogLayerTransport, LogLevel } from 'loglayer';
import { serializeError } from 'serialize-error';

// Re-export LogLevel type for convenience
export type { LogLevel };

// String representation of log levels
export type LogLevelString = keyof typeof LogLevel;

/**
 * Options for creating a LogLayer instance
 */
export interface LoggingOptions {
  readonly transport: LogLayerTransport | LogLayerTransport[];
  readonly serializer?: ErrorSerializerType;
}

/**
 * Create a default LogLayer instance with file rotation
 */
export function createDefaultLogger(_logLevel: LogLevelString): LogLayer {
  return createLogger({
    transport: new LogFileRotationTransport({
      filename: './logs/app.log',
    }),
    serializer: serializeError,
  });
}

/**
 * Create a LogLayer instance with custom options
 */
export function createLogger(options: LoggingOptions): LogLayer {
  const config: LogLayerConfig = { 
    transport: options.transport 
  };
  
  if (options.serializer) {
    config.errorSerializer = options.serializer;
  }

  return new LogLayer(config);
}

/**
 * Create a LogLayer instance for testing (no file output)
 */
export function createTestLogger(): LogLayer {
  return new LogLayer({
    transport: [],
  });
}

/**
 * Application context with logging
 * This replaces the App class but provides just the logging functionality
 */
export interface AppContext {
  readonly log: LogLayer;
}

/**
 * Create an application context with default logging
 */
export function createAppContext(logLevel: LogLevelString): AppContext {
  return {
    log: createDefaultLogger(logLevel),
  };
}