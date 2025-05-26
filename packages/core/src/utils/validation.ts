/**
 * Simple validation utilities
 */

import { createConfigurationError, QuickMcpError } from '../errors/index.ts';

/**
 * Validate and return a port number
 */
export function validatePort(port: number | string): number {
  const portNum = typeof port === 'string' ? Number(port) : port;
  
  if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
    throw createConfigurationError(
      `Invalid port: ${port}. Must be between 1 and 65535.`,
      { port }
    );
  }
  
  return portNum;
}

/**
 * Get default port based on environment
 */
export function getDefaultPort(): number {
  return process.env['NODE_ENV'] === 'production' ? 8080 : 3000;
}

/**
 * Validate OpenAPI spec URL
 */
export function validateSpecUrl(url: string): string {
  try {
    const parsed = new URL(url);
    
    // Check protocol
    if (!['http:', 'https:', 'file:'].includes(parsed.protocol)) {
      throw createConfigurationError(
        `Invalid protocol: ${parsed.protocol}. Must be http, https, or file.`,
        { url }
      );
    }
    
    // For file URLs, check extension
    if (parsed.protocol === 'file:') {
      const path = parsed.pathname;
      if (!path.endsWith('.json') && !path.endsWith('.yaml') && !path.endsWith('.yml')) {
        throw createConfigurationError(
          `File must have .json, .yaml, or .yml extension`,
          { url, path }
        );
      }
    }
    
    return url;
  } catch (error) {
    if (error instanceof QuickMcpError) {
      throw error;
    }
    throw createConfigurationError(
      `Invalid URL: ${url}`,
      { url, cause: error }
    );
  }
}

/**
 * Convert file path to file:// URL
 */
export function filePathToUrl(filePath: string): string {
  const trimmed = filePath.trim();
  
  if (!trimmed.endsWith('.json') && !trimmed.endsWith('.yaml') && !trimmed.endsWith('.yml')) {
    throw createConfigurationError(
      `File must have .json, .yaml, or .yml extension`,
      { filePath }
    );
  }
  
  const fileUrl = trimmed.startsWith('/') 
    ? `file://${trimmed}`
    : `file://${process.cwd()}/${trimmed}`;
    
  return fileUrl;
}