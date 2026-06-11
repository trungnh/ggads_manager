import { CrmAdapter, CrmOrder, CrmConversions } from '../core/CrmAdapter';
import Papa from 'papaparse';

export interface GSheetConfig {
  useApi: boolean;
  sheetUrl?: string; // Added missing sheetUrl
  sheetId?: string;
  sheetName?: string;
  conversionDateCol: string;
  phoneCol: string;
  conversionValueCol: string;
  campaignIdCol: string;
  statusCol?: string; 
  successStatusValue?: string;
}

export class GSheetAdapter implements CrmAdapter {
  constructor(private config: GSheetConfig, private accessToken?: string) {}

  async fetchOrders(startDate: Date, endDate: Date): Promise<CrmOrder[]> {
    // 1. If we have a sheetId and sheetName, try API first
    if (this.config.sheetId && this.config.sheetName && this.accessToken) {
      try {
        return await this.fetchFromApi(this.config.sheetId, this.config.sheetName, startDate, endDate);
      } catch (err) {
        console.warn(`[GSHEET] API fetch failed, trying CSV fallback:`, err);
      }
    }

    // 2. Fallback to CSV if URL exists
    if (this.config.sheetUrl) {
      return this.fetchFromCsv(this.config.sheetUrl, startDate, endDate);
    }

    // 3. Last attempt: Construct CSV URL from sheetId if possible
    if (this.config.sheetId) {
      const constructedUrl = `https://docs.google.com/spreadsheets/d/${this.config.sheetId}/export?format=csv&gid=0`;
      console.log(`[GSHEET] Trying constructed CSV URL: ${constructedUrl}`);
      return this.fetchFromCsv(constructedUrl, startDate, endDate);
    }

    throw new Error('No valid Google Sheet configuration found (missing sheetId, sheetName or sheetUrl)');
  }

  private async fetchFromApi(spreadsheetId: string, range: string, startDate: Date, endDate: Date): Promise<CrmOrder[]> {
    if (!this.accessToken) {
      throw new Error('Access token missing for Google Sheets API');
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?majorDimension=ROWS`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Google Sheets API error: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const rows = data.values as any[][];
    if (!rows || rows.length === 0) return [];

    const orders: CrmOrder[] = [];
    const headers = rows[0].map(h => String(h || ''));
    const dateIdx = this.colToIndex(this.config.conversionDateCol, headers);
    const phoneIdx = this.colToIndex(this.config.phoneCol, headers);
    const valueIdx = this.colToIndex(this.config.conversionValueCol, headers);
    const campIdx = this.colToIndex(this.config.campaignIdCol, headers);
    const statusIdx = this.config.statusCol ? this.colToIndex(this.config.statusCol, headers) : -1;

    console.log(`[GSHEET-DEBUG] Config: Date=${this.config.conversionDateCol}, Phone=${this.config.phoneCol}, Value=${this.config.conversionValueCol}, Camp=${this.config.campaignIdCol}`);
    console.log(`[GSHEET-DEBUG] Headers: ${headers.join(' | ')}`);
    console.log(`[GSHEET-DEBUG] Indexes: Date=${dateIdx}, Phone=${phoneIdx}, Value=${valueIdx}, Camp=${campIdx}`);

    // Detect header
    let startRow = 1;
    if (dateIdx >= 0 && this.parseVNColorDate(String(rows[0][dateIdx] || ''))) {
      startRow = 0;
    }

    for (let i = startRow; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length <= Math.max(dateIdx, phoneIdx, valueIdx, campIdx)) continue;

      const dateStr = String(row[dateIdx] || '');
      const orderDate = this.parseVNColorDate(dateStr);
      if (!orderDate) continue;

      if (orderDate < startDate || orderDate > endDate) continue;

      const phone = String(row[phoneIdx] || '');
      if (!phone) continue;

      let status: number | string = 0;
      if (statusIdx >= 0 && this.config.successStatusValue) {
        const rowStatus = String(row[statusIdx] || '').trim();
        if (rowStatus === this.config.successStatusValue) {
          status = 8;
        }
      }

      const valueStr = String(row[valueIdx] || '0');
      const cleanValue = valueStr.replace(/[₫\s,]/g, '');
      const value = parseFloat(cleanValue);

      orders.push({
        id: `gsheet-api-${i}`,
        phone: phone.trim(),
        campaignId: row[campIdx] ? String(row[campIdx]).trim() : null,
        status: status,
        value: isNaN(value) ? 0 : value,
        createdAt: orderDate,
      });
    }

    console.log(`[GSHEET-API] Parsed ${orders.length} orders`);
    return orders;
  }

  private colToIndex(col: string, headers: string[] = []): number {
    if (!col) return -1;
    const clean = col.trim();
    
    // 1. Check if it's a single letter (A-Z)
    if (clean.length === 1 && /[A-Z]/i.test(clean)) {
      return clean.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
    }

    // 2. Otherwise, treat as header name and find index
    return headers.findIndex(h => h.trim().toLowerCase() === clean.toLowerCase());
  }

  private parseVNColorDate(str: string): Date | null {
    if (!str) return null;
    const clean = str.trim();
    // Handle dd/mm/yyyy
    const parts = clean.split(/[\/\-\.]/);
    if (parts.length === 3) {
      let d, m, y;
      if (parts[0].length === 4) { // yyyy-mm-dd
        y = parseInt(parts[0]);
        m = parseInt(parts[1]);
        d = parseInt(parts[2]);
      } else { // dd-mm-yyyy
        d = parseInt(parts[0]);
        m = parseInt(parts[1]);
        y = parseInt(parts[2]);
      }
      
      if (y > 2000 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return new Date(y, m - 1, d);
      }
    }
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d;
  }

  private async fetchFromCsv(url: string, startDate: Date, endDate: Date): Promise<CrmOrder[]> {
    let fetchUrl = url;
    if (url.includes('/edit')) {
      fetchUrl = url.replace(/\/edit.*$/, '/export?format=csv');
    }

    const response = await fetch(fetchUrl, {
      headers: this.accessToken ? { 
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'text/csv'
      } : {}
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Google Sheet CSV: ${response.status} ${response.statusText}`);
    }

    const csvText = await response.text();
    const result = Papa.parse(csvText, { header: false, skipEmptyLines: true });

    if (result.errors.length > 0) {
      console.warn(`[GSHEET] PapaParse errors:`, result.errors);
    }

    const orders: CrmOrder[] = [];
    const headers = (result.data[0] as string[]) || [];
    const dateIdx = this.colToIndex(this.config.conversionDateCol, headers);
    const phoneIdx = this.colToIndex(this.config.phoneCol, headers);
    const valueIdx = this.colToIndex(this.config.conversionValueCol, headers);
    const campIdx = this.colToIndex(this.config.campaignIdCol, headers);
    const statusIdx = this.config.statusCol ? this.colToIndex(this.config.statusCol, headers) : -1;

    // Start from index 0 or 1 depending on if there's a header
    let startRow = 1;
    if (dateIdx >= 0 && result.data.length > 0) {
      const firstRow = result.data[0] as string[];
      if (this.parseVNColorDate(firstRow[dateIdx])) startRow = 0;
    }

    for (let i = startRow; i < result.data.length; i++) {
      const row = result.data[i] as string[];
      if (!row || row.length <= Math.max(dateIdx, phoneIdx, valueIdx, campIdx)) continue;

      const dateStr = row[dateIdx];
      const orderDate = this.parseVNColorDate(dateStr);
      if (!orderDate) continue;

      // Normalize dates to midnight for comparison if needed, 
      // but here we match the sync range which is also timestamps
      if (orderDate < startDate || orderDate > endDate) {
        continue;
      }

      const phone = row[phoneIdx];
      if (!phone) continue;

      let status: number | string = 0; 
      if (statusIdx >= 0 && this.config.successStatusValue) {
        const rowStatus = String(row[statusIdx] || '').trim();
        if (rowStatus === this.config.successStatusValue) {
          status = 8; 
        }
      }

      const valueStr = row[valueIdx] || '0';
      // Match PHP: str_replace(['₫', ',', ' '], '', ...)
      const cleanValue = valueStr.replace(/[₫\s,]/g, '');
      const value = parseFloat(cleanValue);

      orders.push({
        id: `gsheet-${i}`,
        phone: String(phone).trim(),
        campaignId: row[campIdx] ? String(row[campIdx]).trim() : null,
        status: status,
        value: isNaN(value) ? 0 : value,
        createdAt: orderDate,
      });
    }

    console.log(`[GSHEET] Parsed ${orders.length} orders from CSV`);
    return orders;
  }

  processConversions(orders: CrmOrder[], targetCampaignIds: string[]): Record<string, CrmConversions> {
    // This method is called if we want to process within the adapter, 
    // but CampaignSyncService handles it manually for combined sources.
    const results: Record<string, CrmConversions> = {};
    // ... implementation logic ...
    return results;
  }
}

