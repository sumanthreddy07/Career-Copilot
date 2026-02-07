# Career Copilot

Career Copilot is a Chrome Extension designed to assist software engineers and technical professionals in managing job applications and tailoring resumes to specific job descriptions using large language models.

The tool integrates resume optimization, application tracking, and lightweight analytics into a single workflow that operates directly from the browser’s side panel.

---

## Overview

Modern job applications require significant manual effort: adapting resumes for Applicant Tracking Systems (ATS), tracking submissions, avoiding duplicate applications, and maintaining consistency across roles. Career Copilot addresses these problems by combining:

- Context-aware resume tailoring powered by Gemini
- Automatic job description extraction from web pages
- Structured application logging to Google Sheets
- Intelligent caching and deduplication logic

The extension is designed for **individual use**, prioritizing reliability, transparency, and minimal disruption to existing workflows.

---

## Key Features

### Resume Tailoring
- Generates role-specific resume bullet points aligned to a provided job description
- Preserves strong existing bullets and selectively optimizes weaker ones
- Produces structured, ATS-compliant output
- Assigns relevance scores to each bullet point

### Application Tracking
- Logs job applications to a Google Sheet via Google Apps Script
- Prevents duplicate entries using normalized URL comparison
- Inserts newest applications at the top of the tracker
- Tracks daily application counts

### Smart Caching
- Stores generated results locally per browser tab
- Automatically restores results when revisiting a job page
- Includes timestamped generation metadata
- Expires stale cached data after a fixed time window

### Browser Integration
- Extracts job descriptions directly from common job boards
- Operates entirely from a Chrome side panel
- Requires no external backend beyond Google Apps Script

---

## Architecture

The project follows a modular browser-extension architecture:

├── manifest.json # Chrome Extension configuration (MV3)

├── background.js # Service worker for async generation + logging

├── sidepanel.html # UI layout

├── sidepanel.js # UI logic and state management

├── content.js # Job description scraping

└── apps-script/ # Google Apps Script backend (Sheets + Docs)


### Data Flow
1. Job description is scraped from the active tab
2. Resume generation request is sent to Gemini
3. Results are cached locally with timestamps
4. Job application metadata is logged to Google Sheets
5. Duplicate applications are detected before insertion

---

## Technology Stack

- Chrome Extensions API (Manifest V3)
- Google Gemini API
- Google Apps Script
- Google Sheets
- Vanilla JavaScript (ES6+)

No frameworks are used intentionally to keep the extension lightweight and auditable.

---

## Installation (Development)

### Google Sheets + Google Apps Script (GAS) Setup

Career Copilot uses a Google Spreadsheet + a deployed Google Apps Script Web App to:
- fetch master resume inputs (Google Docs)
- log job applications into a tracker sheet
- return a daily application count for the UI

This setup is intentionally lightweight and requires no external backend.

---

#### 1) Create the Spreadsheet Tabs

Create a Google Spreadsheet with **two tabs**:

##### A. `Tracker` tab
Create a sheet named **`Tracker`** with the following header row in **Row 1**:

| Date | Company | Position | Status | Notes | URL |
|------|---------|----------|--------|-------|-----|

Notes:
- The **URL must be in column F**. Duplicate detection is performed using this column.
- Rows are treated as data starting from **Row 2** (Row 1 is reserved for headers).
- URLs are normalized before storage (query parameters removed, trailing slash removed).

##### B. `Config` tab
Create a sheet named **`Config`** and set the following values:

- Cell **B1**: **Resume Doc ID** (Google Doc file ID)
- Cell **B2**: **Detailed Experience Doc ID** (Google Doc file ID)
- Cell **B3**: **Project Format** (plain text template)

These are read by the Apps Script exactly by cell location.

---

#### 2) Prepare the Google Docs

Career Copilot expects two inputs stored as **native Google Docs**:

- **Master Resume (Skeleton)**: your curated baseline resume
- **Detailed Experience**: expanded context, metrics, and supporting detail

Important:
- These must be **Google Docs**, not PDF or `.docx`, since Apps Script reads them using `DocumentApp`.

To obtain a Doc ID:
- Open the Google Doc
- Copy the string between `/d/` and `/edit` in the URL

---

#### 3) Install the Apps Script into the Spreadsheet

1. Open the Spreadsheet
2. Go to **Extensions → Apps Script**
3. Paste the provided Apps Script code (unchanged)
4. Confirm the sheet name constants match your tabs:
   - `TRACKER_SHEET_NAME = "Tracker"`
   - `CONFIG_SHEET_NAME = "Config"`

---

#### 4) Deploy as a Web App

1. In Apps Script, select **Deploy → New deployment**
2. Choose **Web app**
3. Set:
   - **Execute as:** *Me*
   - **Who has access:** *Anyone*
4. Deploy and complete the authorization prompts
5. Copy the Web App URL (this will be used as the backend endpoint)

---

#### 5) Point the Chrome Extension to the GAS Web App

In the extension code, set `GAS_URL` to your deployed Web App URL.

Example:
- `background.js` uses `GAS_URL` for job logging (`POST`) and document loading (`GET`).

After updating, reload the extension in:
- `chrome://extensions` → **Reload**

---

#### 6) Verify End-to-End

In the extension side panel:
1. Click **Load Documents**  
   - This should update the docs status indicator and populate the daily count.
2. Navigate to a job posting page.
3. Click **Generate Resume**
4. Click **Log / Update** to write the application row into the `Tracker` tab.

---

### Security Notes

- Your Gemini API key is stored locally using `chrome.storage.local`.
- Do not commit personal sheet URLs, document IDs, or API keys to public source control.
- If publishing the repository, consider using placeholder values and a local-only configuration step.

---

## Google Apps Script Setup

The Apps Script backend is responsible for:
- Fetching master resume documents
- Logging applications to Google Sheets
- Preventing duplicate entries
- Returning aggregate application metrics

The script must be deployed as a **Web App** with:
- Access: *Anyone*
- Execution: *As you*

---

## Design Principles

- **Preservation over rewriting**: Existing strong resume bullets are retained
- **Transparency**: All generated content includes relevance scoring
- **Determinism where possible**: Caching and state restoration reduce redundant calls
- **Minimal surface area**: No unnecessary permissions or dependencies
- **Human-in-the-loop**: Output is designed to assist, not automate blind submission

---

## Intended Audience

Career Copilot is intended for:
- Software engineers and technical professionals
- Users comfortable managing their own API keys
- Individuals applying to roles with high ATS scrutiny

It is **not** intended as a fully automated application bot.

---

## Limitations

- Requires a Gemini API key
- Resume quality depends on the quality of the master resume input
- Job description extraction may vary by site structure
- Not optimized for high-volume automated submissions

---

## License

MIT License

---

## Disclaimer

Career Copilot is an independent project and is not affiliated with Google, Gemini, or any job board platform. Users are responsible for ensuring compliance with applicable terms of service when using the extension.

