import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { TokenService } from '@repo/shared';
import { google } from 'googleapis';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sheetId = searchParams.get('sheetId');
  const connectionId = searchParams.get('connectionId');

  if (!sheetId || !connectionId) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    // 1. Get valid access token
    const token = await TokenService.getValidToken(connectionId);

    // 2. Initialize Google Auth client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ access_token: token });

    // 3. Call Google Sheets API using the authorized client
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    const response = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
      fields: 'sheets.properties.title',
    });

    const titles = response.data.sheets?.map(s => s.properties?.title).filter(Boolean) || [];

    return NextResponse.json({ sheets: titles });
  } catch (error: any) {
    console.error('[API_GOOGLE_SHEETS_ERROR]', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch sheets',
      details: error.response?.data || null
    }, { status: 500 });
  }
}
