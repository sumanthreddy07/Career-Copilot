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

1. Clone the repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer Mode**
4. Click **Load unpacked**
5. Select the project root directory
6. Configure your Gemini API key in the extension UI
7. Deploy the provided Apps Script as a Web App

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

