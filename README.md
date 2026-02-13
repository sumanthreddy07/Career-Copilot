# Career Copilot

Career Copilot is a Chrome (Manifest V3) side-panel extension that helps
you: 

1) Tailor resume bullet points to a specific Job Description (JD) using Google Gemini
2) Log job applications directly to Google Sheets using Google Apps Script

This project is designed to be simple, auditable, and easy to set up, no external server required.

------------------------------------------------------------------------

## Features

### 1. Job Description Extraction

-   Scrapes job descriptions from supported job boards (LinkedIn, Workday, Greenhouse, Lever).
-   Uses multiple fallback selectors.
-   Trims excessively large descriptions for stability.

### 2. AI Resume Tailoring (Gemini API)

-   Uses:
    -   Master Resume
    -   Detailed Experience
    -   Project Format Template
    -   Scraped Job Description
-   Returns structured JSON output.
-   Preserves strong bullets.
-   Aligns with ATS keywords.
-   Produces STAR-ready statements.

### 3. Google Sheets Application Tracker

-   Logs:
    -   Date
    -   Company
    -   Position
    -   Status
    -   Notes
    -   URL
-   URL normalization removes tracking parameters.
-   Duplicate detection based on normalized URL.
-   Inserts new entries at the top of the sheet.
-   Returns today's application count.

### 4. Local Storage & Caching

-   Uses chrome.storage.local for:
    -   Per-tab state
    -   Generated output
    -   Cached documents
-   Prevents repeated document downloads.

------------------------------------------------------------------------

## Repository Structure

Career-Copilot/

├─ manifest.json\
├─ background.js\
├─ content.js\
├─ sidepanel.html\
├─ sidepanel.js\
├─ AppsScript.txt\
└─ LICENSE

------------------------------------------------------------------------

## Setup Guide

### Step 1: Google Sheet Setup

Create a Google Spreadsheet with two tabs:

#### Tracker Tab (Row 1 Headers)

Date \| Company \| Position \| Status \| Notes \| URL

Important: - URL must be Column F. - Keep header order unchanged.

#### Config Tab

B1: Master Resume Google Doc ID\
B2: Detailed Experience Google Doc ID\
B3: Project Format Template (plain text)

------------------------------------------------------------------------

### Step 2: Google Docs

Create two Google Docs: - Master Resume - Detailed Experience

Copy each document ID from the URL: Between `/d/` and `/edit`.

------------------------------------------------------------------------

### Step 3: Deploy Google Apps Script

1.  Open Spreadsheet → Extensions → Apps Script
2.  Paste code from AppsScript.txt
3.  Deploy → New Deployment → Web App
4.  Execute as: Me
5.  Access: Anyone
6.  Copy Web App URL (ends with /exec)

------------------------------------------------------------------------

### Step 4: Configure Extension

Update both background.js and sidepanel.js:

const GAS_URL = "YOUR_DEPLOYED_WEBAPP_URL"; 
const GEMINI_MODEL = "gemini-2.5-flash";

Update manifest.json content_scripts.matches with job site URLs.

------------------------------------------------------------------------

### Step 5: Load Extension

1.  Open chrome://extensions
2.  Enable Developer Mode
3.  Click Load Unpacked
4.  Select repository folder

------------------------------------------------------------------------

## How To Use

1.  Open a job posting page.
2.  Open Career Copilot side panel.
3.  Click Load Documents.
4.  Enter Gemini API key.
5.  Confirm JD + Company fields.
6.  Click Generate Resume.
7.  Click Log / Update to save application.

------------------------------------------------------------------------

## Data Flow

content.js → sidepanel.js → background.js\
background.js → Gemini API + Google Apps Script\
Results stored in chrome.storage.local

------------------------------------------------------------------------

## Troubleshooting

Scrape not working: - Check manifest matches.

Timeout errors: - Reduce JD size. - Increase timeout in background.js.

Duplicate logging: - URL normalization prevents duplicate entries.

------------------------------------------------------------------------

## Security

-   Gemini API key stored locally.
-   Data only sent to:
    1)  Gemini API
    2)  Your deployed Google Apps Script

Deploy under your own Google account for full control.

------------------------------------------------------------------------

## License

MIT License
