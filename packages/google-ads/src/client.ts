import { TokenService } from '@repo/shared';

const GOOGLE_ADS_API_VERSION = 'v24'; 
const BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

export class GoogleAdsClient {
  public connectionId: string;
  public customerId: string;
  private loginCustomerId?: string;

  constructor(connectionId: string, customerId: string, loginCustomerId?: string) {
    this.connectionId = connectionId;
    // Strip hyphens
    this.customerId = customerId.replace(/-/g, '');
    
    const rawLoginId = loginCustomerId?.replace(/-/g, '') || process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.replace(/-/g, '');
    // Only set loginCustomerId if it's a valid numeric string of digits (avoiding placeholder strings like 'your_manager_mcc_id')
    if (rawLoginId && /^\d+$/.test(rawLoginId)) {
      this.loginCustomerId = rawLoginId;
    } else {
      this.loginCustomerId = undefined;
    }
  }

  /**
   * Helper to make REST calls to Google Ads API with automatic retry and rate limiting handling.
   */
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const accessToken = await TokenService.getValidToken(this.connectionId);
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

    if (!developerToken) {
      throw new Error('GOOGLE_ADS_DEVELOPER_TOKEN is not configured');
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': developerToken,
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {})
    };

    if (this.loginCustomerId) {
      headers['login-customer-id'] = this.loginCustomerId;
    }

    // Ensure endpoint doesn't start with / if we are prepending BASE_URL
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}/${cleanEndpoint}`;

    // Basic retry logic for RESOURCE_EXHAUSTED (Rate Limiting)
    let retries = 3;
    let delay = 1000;

    while (retries > 0) {
      const response = await fetch(url, { ...options, headers });

      if (response.status === 429) { // RESOURCE_EXHAUSTED
        retries--;
        if (retries === 0) throw new Error('Rate limit exceeded after retries');
        await new Promise(r => setTimeout(r, delay));
        delay *= 2; // Exponential backoff
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Ads API Error: ${response.status} - ${errorText}`);
      }

      return await response.json() as T;
    }

    throw new Error('Unexpected end of request loop');
  }

  /**
   * GAQL searchStream wrapper
   */
  async searchStream<T = any>(query: string): Promise<T[]> {
    // Note: searchStream in REST returns an array of response objects
    const response = await this.request<any>(`customers/${this.customerId}/googleAds:searchStream`, {
      method: 'POST',
      body: JSON.stringify({ query }),
    });

    const allResults: T[] = [];
    if (Array.isArray(response)) {
      for (const chunk of response) {
        if (chunk.results) {
          allResults.push(...chunk.results);
        }
      }
    } else if (response.results) {
      allResults.push(...response.results);
    }

    return allResults;
  }

  /**
   * Mutate wrapper for batch operations
   */
  async mutate<T = any>(endpoint: string, operations: any[]): Promise<T> {
    return await this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify({ operations })
    });
  }
}
