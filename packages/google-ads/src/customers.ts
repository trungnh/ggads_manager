import { TokenService } from '@repo/shared';

export interface AdsAccountHierarchy {
  id: string;
  name: string;
  currency: string;
  timeZone: string;
  isManager: boolean;
  parentId?: string;
  loginCustomerId?: string; // The MCC ID used for API login
}

export class CustomersService {
  private connectionId: string;
  private apiVersion = 'v24';

  constructor(connectionId: string) {
    this.connectionId = connectionId;
  }

  /**
   * Lists all accessible accounts in a flattened list with parent relationships.
   */
  async listAllAccessibleAccounts(): Promise<AdsAccountHierarchy[]> {
    const accessToken = await TokenService.getValidToken(this.connectionId);
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

    if (!developerToken) {
      throw new Error('GOOGLE_ADS_DEVELOPER_TOKEN is not set in environment variables');
    }

    // 1. Get Top-level accessible customers
    const url = `https://googleads.googleapis.com/${this.apiVersion}/customers:listAccessibleCustomers`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[CUSTOMERS_SERVICE] Error listing customers (Status ${response.status}):`, errorBody);
      
      if (response.status === 404) {
        return [];
      }
      throw new Error(`Google Ads API Error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    const topLevelIds = (data.resourceNames || []).map((rn: string) => rn.split('/')[1]);
    
    const allAccountsMap = new Map<string, AdsAccountHierarchy>();

    // 2. For each top-level account, fetch details and its entire hierarchy
    const processAccount = async (id: string, token: string) => {
      const searchUrl = `https://googleads.googleapis.com/${this.apiVersion}/customers/${id}/googleAds:search`;
      const query = `
        SELECT 
          customer_client.id, 
          customer_client.descriptive_name, 
          customer_client.currency_code, 
          customer_client.time_zone, 
          customer_client.manager,
          customer_client.status,
          customer_client.level
        FROM customer_client
        WHERE customer_client.status = 'ENABLED'
      `;

      const res = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'developer-token': developerToken!,
          'login-customer-id': id, // ESSENTIAL for searching under an MCC
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query })
      });

      if (!res.ok) {
        console.warn(`[CUSTOMERS_SERVICE] Failed search for ${id}, falling back to single details...`);
        const details = await this.getCustomerDetails(id);
        if (details) {
          allAccountsMap.set(id, {
            id,
            name: details.name || `Account ${id}`,
            currency: details.currencyCode,
            timeZone: details.timeZone,
            isManager: details.manager,
          });
        }
        return;
      }

      const searchData = await res.json();
      (searchData.results || []).forEach((row: any) => {
        const acc = row.customerClient;
        if (acc) {
          const isChild = acc.level > 0;
          const existing = allAccountsMap.get(acc.id);
          if (!existing || isChild) {
             allAccountsMap.set(acc.id, {
              id: acc.id,
              name: acc.descriptiveName || `Account ${acc.id}`,
              currency: acc.currencyCode,
              timeZone: acc.timeZone,
              isManager: acc.manager,
              parentId: isChild ? id : undefined,
              loginCustomerId: isChild ? id : undefined,
            });
          }
        }
      });
    };

    await Promise.allSettled(topLevelIds.map((id: string) => processAccount(id, accessToken)));

    return Array.from(allAccountsMap.values());
  }

  /**
   * Fetches descriptive details for a specific customer.
   */
  async getCustomerDetails(customerId: string, loginCustomerId?: string) {
    const accessToken = await TokenService.getValidToken(this.connectionId);
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const url = `https://googleads.googleapis.com/${this.apiVersion}/customers/${customerId}/googleAds:search`;
    const query = `SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone, customer.status, customer.manager FROM customer LIMIT 1`;
    
    const headers: any = { 
      'Authorization': `Bearer ${accessToken}`, 
      'developer-token': developerToken!, 
      'Content-Type': 'application/json' 
    };
    
    if (loginCustomerId) {
      headers['login-customer-id'] = loginCustomerId;
    } else {
      headers['login-customer-id'] = customerId;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query })
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const c = data.results?.[0]?.customer;
    if (!c) return null;
    return {
      id: c.id,
      name: c.descriptiveName,
      currencyCode: c.currencyCode,
      timeZone: c.timeZone,
      manager: c.manager,
      status: c.status,
    };
  }
}
