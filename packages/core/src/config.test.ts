import { describe, it, expect } from 'vitest';

import { loadEnvironmentConfig, collectHeader } from './config.ts';

describe('Config Module', () => {
  describe('loadEnvironmentConfig', () => {
    it('should return empty config when no environment variables are set', () => {
      // Save and clear relevant env vars
      const originalEnv = {
        PORT: process.env['PORT'],
        OPENAPI_SPEC_URL: process.env['OPENAPI_SPEC_URL'],
        BASE_URL: process.env['BASE_URL'],
        LOG_LEVEL: process.env['LOG_LEVEL'],
        TRANSPORT: process.env['TRANSPORT'],
        AUTH_HEADERS: process.env['AUTH_HEADERS'],
      };

      delete process.env['PORT'];
      delete process.env['OPENAPI_SPEC_URL'];
      delete process.env['BASE_URL'];
      delete process.env['LOG_LEVEL'];
      delete process.env['TRANSPORT'];
      delete process.env['AUTH_HEADERS'];

      const config = loadEnvironmentConfig();
      expect(config).toEqual({});

      // Restore env vars
      for (const [key, value] of Object.entries(originalEnv)) {
        if (value !== undefined) {
          process.env[key] = value;
        }
      }
    });
  });

  describe('collectHeader', () => {
    it('should parse valid header string', () => {
      const headers = new Headers();
      const result = collectHeader('Authorization=Bearer token', headers);

      expect(result.get('Authorization')).toBe('Bearer token');
    });

    it('should handle header values with equals signs', () => {
      const headers = new Headers();
      const result = collectHeader('X-Token=abc=def=ghi', headers);

      expect(result.get('X-Token')).toBe('abc=def=ghi');
    });

    it('should trim whitespace from key and value', () => {
      const headers = new Headers();
      const result = collectHeader('  Authorization  =  Bearer token  ', headers);

      expect(result.get('Authorization')).toBe('Bearer token');
    });

    it('should preserve existing headers', () => {
      const headers = new Headers();
      headers.set('Existing', 'value');

      const result = collectHeader('New=header', headers);

      expect(result.get('Existing')).toBe('value');
      expect(result.get('New')).toBe('header');
    });

    it('should throw error for invalid header format', () => {
      const headers = new Headers();
      
      expect(() => collectHeader('InvalidHeader', headers)).toThrow();
      expect(() => collectHeader('=value', headers)).toThrow();
    });
  });
});