/**
 * Transport factory for creating appropriate transport adapters
 */

import type { TransportType } from '../config.ts';
import { createTransportError } from '../errors/index.ts';

import { HttpTransport } from './http.ts';
import type { TransportAdapter, TransportOptions } from './index.ts';
import { StdioTransport } from './stdio.ts';

/**
 * Create a transport adapter based on the specified type
 * 
 * @param type - The transport type to create ('http' or 'stdio')
 * @param options - Configuration options for the transport
 * @returns A transport adapter instance
 * @throws {TransportError} When an unknown transport type is specified
 */
export function createTransport(type: TransportType, options: TransportOptions): TransportAdapter {
  switch (type) {
    case 'http':
      return new HttpTransport(options);
    case 'stdio':
      return new StdioTransport(options);
    default: {
      // TypeScript should prevent this, but add runtime safety
      const unknownType = type as string;
      throw createTransportError(
        `Unknown transport type: "${unknownType}". Valid types are: http, stdio`,
        { transportType: unknownType, validTypes: ['http', 'stdio'] }
      );
    }
  }
}

