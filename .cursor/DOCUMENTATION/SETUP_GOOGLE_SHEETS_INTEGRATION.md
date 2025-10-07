# Guide: Setting up Google Sheets Integration for Lead Capture

This guide outlines the steps to integrate your Next.js application with Google Sheets for storing lead information using a service account.

## Phase 1: Google Cloud Platform & Google Sheets Setup

1.  **Create or Select a Google Cloud Project:**
    *   Go to the [Google Cloud Console](https://console.cloud.google.com/).
    *   If you don't have a project, create a new one. Otherwise, select an existing project.

2.  **Enable the Google Sheets API:**
    *   In the Cloud Console, navigate to "APIs & Services" > "Library".
    *   Search for "Google Sheets API" and click on it.
    *   Click the "Enable" button.

3.  **Create Service Account Credentials:**
    *   Go to "APIs & Services" > "Credentials".
    *   Click "+ CREATE CREDENTIALS" and select "Service account".
    *   Fill in the service account details:
        *   **Service account name:** (e.g., `fortune-teller-leads-writer`)
        *   **Service account ID:** (will be auto-generated)
        *   **Description:** (e.g., "Writes lead data from the fortune teller app to Google Sheets")
    *   Click "CREATE AND CONTINUE".
    *   **Grant this service account access to project (Optional):** For writing to sheets, you typically don't need to grant project-level roles here. You'll grant sheet-specific access later. You can skip this for now. Click "CONTINUE".
    *   **Grant users access to this service account (Optional):** You can skip this. Click "DONE".
    *   Find your newly created service account in the list. Click on its email address.
    *   Go to the "KEYS" tab.
    *   Click "ADD KEY" > "Create new key".
    *   Choose "JSON" as the key type and click "CREATE".
    *   A JSON file containing your service account credentials will be downloaded. **Keep this file secure and private!**

4.  **Create Your Google Sheet:**
    *   Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet.
    *   Name it (e.g., "Fortune Teller Leads").
    *   Define your header row (the first row). For example:
        `Timestamp | FullName | Email | Industry | CompanyName | FortuneText | FlowSource | LinkedInProfileUrl | LinkedInHeadline | LinkedInLocation | Persona | SelectedQuestionIds | SelectedQuestionTexts | SelectedTarotCards | SessionId`
        *(Note: You can add or remove columns as needed; ensure they match the order used by the API range.)*

5.  **Share the Google Sheet with Your Service Account:**
    *   Open the JSON credentials file you downloaded. Find the `client_email` value (e.g., `your-service-account-name@your-project-id.iam.gserviceaccount.com`).
    *   In your Google Sheet, click the "Share" button (top right).
    *   Paste the service account's `client_email` into the "Add people and groups" field.
    *   Ensure the service account has **Editor** permissions.
    *   Uncheck "Notify people" (optional).
    *   Click "Share".

## Phase 2: Next.js API Route Implementation

1.  **Install Google APIs Client Library:**
    *   In your Next.js project terminal:
        ```bash
        npm install googleapis
        # or
        yarn add googleapis
        ```

2.  **Store Service Account Credentials Securely:**
    *   **Do not commit the JSON key file to your repository.**
    *   Use environment variables. Create/edit a `.env.local` file in the root of your Next.js project:
        ```env
        GOOGLE_SHEETS_CLIENT_EMAIL="your-service-account-client-email@your-project.iam.gserviceaccount.com"
        GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_LINE_1\nYOUR_PRIVATE_KEY_LINE_2\n...\n-----END PRIVATE KEY-----\n"
        GOOGLE_SHEET_ID="your_spreadsheet_id_from_the_url"
        ```
        *   **`GOOGLE_SHEETS_PRIVATE_KEY` Formatting:**
            *   The private key from the JSON file contains `\n` for newlines.
            *   In the `.env.local` file, represent these as literal `\\n` (double backslash n) when the key is enclosed in double quotes.
            *   Example: `GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nFIRSTLINE\\nSECONDLINEl\\n-----END PRIVATE KEY-----\\n"`
            *   This ensures that `process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n')` in the API route correctly converts them to actual newline characters.
        *   **`GOOGLE_SHEET_ID`**: Get this from the URL of your Google Sheet (e.g., `https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID_HERE/edit#gid=0`).

3.  **API Route Code (`app/api/submit-lead/route.js`):**
    *   The API route has been created. It:
        *   Authenticates using the environment variables.
        *   Receives `fullName`, `email`, `industry`, `companyName`, and `fortuneText`, plus optional extras like `flowSource`, LinkedIn details, persona, selected questions, selected tarot cards, and a `sessionId`.
        *   Appends a new row to `Sheet1!A:O` (Timestamp, FullName, Email, Industry, CompanyName, FortuneText, FlowSource, LinkedInProfileUrl, LinkedInHeadline, LinkedInLocation, Persona, SelectedQuestionIds, SelectedQuestionTexts, SelectedTarotCards, SessionId).
        *   **Important:** Ensure your actual Google Sheet tab name is `Sheet1` or update the `range` in the API route.

## Phase 3: Frontend Implementation

1.  **Contact Details Page (`app/contact-details/page.js`):**
    *   This page has been created. It includes a form to collect Email and an optional Phone Number.
    *   It retrieves `fullName`, `industry`, `companyName`, and `fortuneText` (simulated from `localStorage` in the example code – adapt as needed for your state management).
    *   On submission, it makes a POST request to `/api/submit-lead`.
    *   Handles loading, success, and error states.

## Important Notes & Troubleshooting

*   **Sheet Name:** In the API route, `range = 'Sheet1!A:O';`, ensure `Sheet1` matches the actual name of your sheet tab.
*   **Permissions:** Double-check the service account has "Editor" access to your Google Sheet.
*   **API Enabled:** Verify the Google Sheets API is enabled in your Cloud project.
*   **Environment Variables:**
    *   Keep `.env.local` in your `.gitignore`.
    *   Set these variables in your deployment environment (Vercel, Netlify, etc.).
    *   The `GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n')` in the API route is crucial for correct parsing of the private key.
*   **Error Handling:** The API route includes error handling. Check server logs and Google API responses for detailed error messages if issues occur. The `ERR_OSSL_UNSUPPORTED` error, for example, typically points to an incorrectly formatted private key in the environment variables.
*   **Security:** The API route acts as a secure intermediary. Never expose your service account's private key or the full JSON credentials file on the client-side.
