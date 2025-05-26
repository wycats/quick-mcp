/**
 * Simple type aliases and validation functions
 * 
 * These replace the over-engineered domain objects with simple types
 */

import type { Tagged } from 'type-fest';

import { createConfigurationError, QuickMcpError } from './errors/index.ts';

// Branded types for better type safety
export type Port = Tagged<number, 'Port'>;
export type SpecUrl = Tagged<string, 'SpecUrl'>;

/**
 * Validate port number is in valid range
 */
export function validatePort(port: number | string): Port {
  const portNum = typeof port === 'string' ? Number(port) : port;
  
  if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
    throw createConfigurationError(
      `Invalid port: ${port}. Must be between 1 and 65535.`,
      { port }
    );
  }
  
  return portNum as Port;
}

/**
 * Parse port from string
 */
export function parsePort(portString: string): Port {
  const trimmed = portString.trim();
  
  if (!trimmed) {
    throw createConfigurationError('Port string cannot be empty');
  }
  
  return validatePort(trimmed);
}

/**
 * Get default port based on environment
 */
export function getDefaultPort(): Port {
  return (process.env['NODE_ENV'] === 'production' ? 8080 : 3000) as Port;
}

/**
 * Validate OpenAPI spec URL
 */
export function validateSpecUrl(url: string): SpecUrl {
  if (!url.trim()) {
    throw createConfigurationError('OpenAPI spec URL cannot be empty');
  }
  
  const trimmed = url.trim();
  
  try {
    const parsed = new URL(trimmed);
    
    // Check protocol
    if (!['http:', 'https:', 'file:'].includes(parsed.protocol)) {
      throw createConfigurationError(
        `Invalid protocol: ${parsed.protocol}. Must be http, https, or file.`,
        { url: trimmed }
      );
    }
    
    // For file URLs, check extension
    if (parsed.protocol === 'file:') {
      const path = parsed.pathname;
      if (!path.endsWith('.json') && !path.endsWith('.yaml') && !path.endsWith('.yml')) {
        throw createConfigurationError(
          `File must have .json, .yaml, or .yml extension`,
          { url: trimmed, path }
        );
      }
    }
    
    return trimmed as SpecUrl;
  } catch (error) {
    if (error instanceof QuickMcpError) {
      throw error;
    }
    throw createConfigurationError(
      `Invalid URL: ${trimmed}`,
      { url: trimmed, cause: error }
    );
  }
}

/**
 * Convert file path to file:// URL
 */
export function filePathToUrl(filePath: string): SpecUrl {
  const trimmed = filePath.trim();
  
  if (!trimmed) {
    throw createConfigurationError('File path cannot be empty');
  }
  
  if (!trimmed.endsWith('.json') && !trimmed.endsWith('.yaml') && !trimmed.endsWith('.yml')) {
    throw createConfigurationError(
      `File must have .json, .yaml, or .yml extension`,
      { filePath }
    );
  }
  
  const fileUrl = trimmed.startsWith('/') 
    ? `file://${trimmed}`
    : `file://${process.cwd()}/${trimmed}`;
    
  return fileUrl as SpecUrl;
}