import { describe, expect, it } from 'vitest';

import { getBaseUrl } from './url-utils.ts';
import type { UrlProvider } from './url-utils.ts';

describe('getBaseUrl', () => {
  it('should return the base URL from the OAS', () => {
    // Create mock with a URL
    const provider: UrlProvider = { url: () => 'https://api.example.com' };
    expect(getBaseUrl(provider)).toBe('https://api.example.com');
  });

  it('should remove trailing slashes', () => {
    const provider: UrlProvider = { url: () => 'https://api.example.com/' };
    expect(getBaseUrl(provider)).toBe('https://api.example.com');
  });
});