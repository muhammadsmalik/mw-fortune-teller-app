import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function POST(req) {
  if (req.method !== 'POST') {
    return NextResponse.json({ message: 'Only POST requests allowed' }, { status: 405 });
  }

  try {
    const { fullName, email, /* phoneNumber, */ industry, companyName, fortuneText } = await req.json();

    // Basic validation
    if (!email || !fullName || !industry || !companyName || !fortuneText) {
      return NextResponse.json({ message: 'Missing required fields. Ensure fullName, email, industry, companyName, and fortuneText are provided.' }, { status: 400 });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    // Ensure 'Sheet1' is the correct name of your sheet/tab.
    // The range A:F assumes Timestamp, FullName, Email, Industry, CompanyName, FortuneText
    const range = 'Sheet1!A:F'; 

    const valueInputOption = 'USER_ENTERED';
    const timestamp = new Date().toISOString();

    const resource = {
      values: [[timestamp, fullName, email, industry, companyName, fortuneText]],
    };

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption,
      resource,
    });

    return NextResponse.json({ message: 'Your details are saved! ✨\nFeel free to share your amazing fortune.', data: response.data }, { status: 200 });

  } catch (error) {
    console.error('Error submitting lead to Google Sheets:', error);
    
    let errorMessage = 'Failed to submit lead.';
    let errorDetails = error.message;
    let statusCode = 500;

    if (error.response && error.response.data && error.response.data.error) {
      errorMessage = `Google API Error: ${error.response.data.error.message || error.response.data.error.status}`;
      errorDetails = error.response.data.error.details || error.message;
      statusCode = error.response.status || 500;
    } else if (error.message.includes('Missing required fields')) {
      statusCode = 400;
      errorMessage = error.message;
    }

    return NextResponse.json({ message: errorMessage, details: errorDetails }, { status: statusCode });
  }
} 