import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function POST(req) {
  if (req.method !== 'POST') {
    return NextResponse.json({ message: 'Only POST requests allowed' }, { status: 405 });
  }

  try {
    console.log('[submit-lead] Request received');
    const {
      fullName,
      email,
      /* phoneNumber, */
      industry,
      companyName,
      fortuneText,
      // Optional enrichment fields
      flowSource, // 'linkedin' | 'manual'
      linkedinProfileUrl,
      linkedinHeadline,
      linkedinCity,
      linkedinCountry,
      persona,
      selectedQuestionIds,
      selectedQuestionTexts,
      selectedTarotCards,
      sessionId,
    } = await req.json();

    console.log('[submit-lead] Payload summary', {
      hasFullName: !!fullName,
      hasEmail: !!email,
      hasIndustry: !!industry,
      hasCompanyName: !!companyName,
      fortuneTextLen: fortuneText ? String(fortuneText).length : 0,
      flowSource: flowSource || 'unknown',
      persona: persona || '',
      selectedQuestionIdsCount: Array.isArray(selectedQuestionIds) ? selectedQuestionIds.length : undefined,
      selectedTarotCardsCount: Array.isArray(selectedTarotCards) ? selectedTarotCards.length : undefined,
      sessionId: sessionId || '',
    });

    // Basic validation
    if (!email || !fullName || !industry || !companyName || !fortuneText) {
      return NextResponse.json({ message: 'Missing required fields. Ensure fullName, email, industry, companyName, and fortuneText are provided.' }, { status: 400 });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        // Convert literal \n sequences to real newlines
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    console.log('[submit-lead] Env readiness', {
      hasClientEmail: !!process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      hasSheetId: !!spreadsheetId,
    });
    // Ensure 'Sheet1' matches your sheet/tab name.
    // Anchor the table at A1 to avoid drifting columns when appending.
    // Columns:
    // A: Timestamp | B: FullName | C: Email | D: Industry | E: CompanyName | F: FortuneText
    // G: FlowSource | H: LinkedInProfileUrl | I: LinkedInHeadline | J: LinkedInLocation (City, Country)
    // K: Persona | L: SelectedQuestionIds | M: SelectedQuestionTexts | N: SelectedTarotCards | O: SessionId
    const range = 'Sheet1!A1:O1'; 

    const valueInputOption = 'USER_ENTERED';
    const timestamp = new Date().toISOString();

    const locationCombined = [linkedinCity, linkedinCountry].filter(Boolean).join(', ');

    const resource = {
      values: [[
        timestamp,
        fullName,
        email,
        industry,
        companyName,
        fortuneText,
        flowSource || '',
        linkedinProfileUrl || '',
        linkedinHeadline || '',
        locationCombined || '',
        persona || '',
        Array.isArray(selectedQuestionIds) ? selectedQuestionIds.join(' | ') : (selectedQuestionIds || ''),
        Array.isArray(selectedQuestionTexts) ? selectedQuestionTexts.join(' | ') : (selectedQuestionTexts || ''),
        Array.isArray(selectedTarotCards) ? selectedTarotCards.join(' | ') : (selectedTarotCards || ''),
        sessionId || '',
      ]],
    };

    console.log('[submit-lead] Prepared row preview', {
      columns: resource.values[0].length,
      range,
      spreadsheetIdSuffix: spreadsheetId ? String(spreadsheetId).slice(-6) : 'missing',
      fortunePreview: fortuneText ? String(fortuneText).slice(0, 80) + (String(fortuneText).length > 80 ? '…' : '') : '',
    });

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption,
      insertDataOption: 'INSERT_ROWS',
      includeValuesInResponse: true,
      responseValueRenderOption: 'UNFORMATTED_VALUE',
      responseDateTimeRenderOption: 'FORMATTED_STRING',
      resource,
    });

    const updates = response?.data?.updates || {};
    console.log('[submit-lead] Append result', {
      updatedRange: updates.updatedRange,
      updatedRows: updates.updatedRows,
      updatedColumns: updates.updatedColumns,
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
