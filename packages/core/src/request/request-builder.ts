/**
 * Request building utilities for Quick-MCP
 * 
 * This provides focused functions for building HTTP requests
 * from OpenAPI operations and MCP tool arguments.
 */

import type { LogLayer } from 'loglayer';
import { parseTemplate } from 'url-template';

import type { QuickMcpOperation } from '../operation/ext.ts';

import { createSearchParams } from './request-utils.ts';
import type { BucketedArgs, JsonObject } from './request-utils.ts';
import { getBaseUrl } from './url-utils.ts';
import type { OasRequestArgs } from './url-utils.ts';

/**
 * Build a complete Request object for an OpenAPI operation
 * 
 * This is the main function - it does everything needed to create
 * a proper HTTP request without unnecessary layers.
 */
export function buildRequest(
  app: { log: LogLayer },
  op: QuickMcpOperation,
  args: OasRequestArgs,
  bearerToken?: string,
): Request {
  app.log.trace('Building request with args', JSON.stringify(args, null, 2));

  // Convert args to organized buckets (path, query, body, etc.)
  const bucketed = op.bucketArgs(args as JsonObject);
  app.log.trace('Bucketed args', JSON.stringify(bucketed, null, 2));

  // Build the URL with path params and query string
  const url = buildRequestUrl(app, op, bucketed);
  
  // Build the request body and determine content type
  const { body, contentType } = buildRequestBody(app, bucketed);
  
  // Create headers
  const headers = new Headers();
  if (contentType) {
    headers.set('Content-Type', contentType);
  }
  headers.set('Accept', op.responseType);
  
  // Add authorization header if bearer token is provided
  if (bearerToken) {
    headers.set('Authorization', `Bearer ${bearerToken}`);
  }

  // Create the final request
  const request = new Request(url, {
    method: op.verb.uppercase,
    headers,
    body: body ?? null,
  });

  app.log.debug(`Built request: ${request.method} ${request.url}`);
  return request;
}

/**
 * Build the complete URL with path parameters and query string
 */
function buildRequestUrl(
  app: { log: LogLayer },
  op: QuickMcpOperation,
  bucketed: BucketedArgs
): URL {
  // Get base URL from OpenAPI spec
  const baseUrl = getBaseUrl(op.oas);
  app.log.debug(`Base URL: ${baseUrl}`);

  // Expand path template with parameters
  const template = parseTemplate(op.path);
  const pathParams = Object.fromEntries(
    Object.entries(bucketed.path).map(([k, v]) => [k, String(v)])
  );
  const expandedPath = template.expand(pathParams);
  app.log.debug(`Expanded path: ${op.path} → ${expandedPath}`);

  // Build the complete URL
  const baseUrlObj = new URL(baseUrl);
  const basePath = baseUrlObj.pathname.replace(/\/$/, '');
  const normalizedPath = expandedPath.startsWith('/') ? expandedPath : `/${expandedPath}`;
  baseUrlObj.pathname = `${basePath}${normalizedPath}`;

  // Add query parameters
  if (Object.keys(bucketed.query).length > 0) {
    createSearchParams(bucketed.query, baseUrlObj.searchParams);
    app.log.debug(`Added query params: ${Object.keys(bucketed.query).join(', ')}`);
  }

  app.log.debug(`Final URL: ${baseUrlObj.toString()}`);
  return baseUrlObj;
}

/**
 * Build the request body and determine appropriate content type
 */
function buildRequestBody(
  app: { log: LogLayer },
  bucketed: BucketedArgs
): { body?: string | FormData; contentType: string | null } {
  // Direct body provided
  if (bucketed.body !== undefined) {
    if (typeof bucketed.body === 'string') {
      return { body: bucketed.body, contentType: 'text/plain' };
    }
    if (bucketed.body !== null && typeof bucketed.body === 'object') {
      try {
        return { 
          body: JSON.stringify(bucketed.body), 
          contentType: 'application/json' 
        };
      } catch (error) {
        app.log.debug('Failed to serialize body as JSON', String(error));
      }
    }
  }

  // Form data
  if (bucketed.formData) {
    const body = bucketed.formData instanceof URLSearchParams
      ? bucketed.formData.toString()
      : bucketed.formData;
    return { 
      body, 
      contentType: 'application/x-www-form-urlencoded' 
    };
  }

  // No body
  return { contentType: null };
}

/**
 * Alternative API: Build RequestInit + URL separately (for advanced use cases)
 * 
 * This is useful if you need more control over request creation,
 * but most code should use buildRequest() instead.
 */
export function buildRequestParts(
  app: { log: LogLayer },
  op: QuickMcpOperation,
  args: OasRequestArgs,
): { url: URL; init: RequestInit } {
  const bucketed = op.bucketArgs(args as JsonObject);
  const url = buildRequestUrl(app, op, bucketed);
  const { body, contentType } = buildRequestBody(app, bucketed);
  
  const headers = new Headers();
  if (contentType) {
    headers.set('Content-Type', contentType);
  }
  headers.set('Accept', op.responseType);

  const init: RequestInit = {
    method: op.verb.uppercase,
    headers,
    body: body ?? null,
  };

  return { url, init };
}