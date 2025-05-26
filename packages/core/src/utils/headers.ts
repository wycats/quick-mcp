/**
 * Simple header utilities using native Headers
 */

import { createConfigurationError, QuickMcpError } from '../errors/index.ts';

/**
 * Parse a header string of the form "key=value"
 */
export function parseHeaderString(headerString: string): Headers {
  const [key, ...rest] = headerString.split('=');
  if (!key || rest.length === 0) {
    throw createConfigurationError(
      `Invalid header format: "${headerString}". Expected format: "Name=Value"`,
      { headerString }
    );
  }

  const headers = new Headers();
  headers.set(key.trim(), rest.join('=').trim());
  return headers;
}

/**
 * Parse JSON string containing headers
 */
export function parseHeadersFromJSON(jsonString: string): Headers {
  try {
    const parsed = JSON.parse(jsonString);
    
    if (typeof parsed !== 'object' || parsed === null) {
      throw createConfigurationError(
        'Headers JSON must be an object',
        { jsonString }
      );
    }
    
    const headers = new Headers();
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value !== 'string') {
        throw createConfigurationError(
          `Header value for "${key}" must be a string`,
          { key, value }
        );
      }
      headers.set(key, value);
    }
    
    return headers;
  } catch (error) {
    if (error instanceof QuickMcpError) {
      throw error;
    }
    throw createConfigurationError(
      `Failed to parse headers JSON: ${jsonString}`,
      { jsonString, cause: error }
    );
  }
}

/**
 * Convert Headers to a plain object
 */
export function headersToObject(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

/**
 * Merge multiple Headers instances
 */
export function mergeHeaders(...headerSets: Headers[]): Headers {
  const result = new Headers();
  for (const headers of headerSets) {
    headers.forEach((value, key) => {
      result.set(key, value);
    });
  }
  return result;
}