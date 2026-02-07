chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type === 'GET_DATA') {
    
    // --- 1. GET JD (Smart Search) ---
    const selectors = [
      '.jobs-description__content',      // LinkedIn
      '.job-description',                // Generic
      '[id*="job-description"]',         // Greenhouse/Lever
      '[class*="description"]',          // Wildcard
      '.wd-PageContent',                 // Workday
      '#content'
    ];

    let jdText = "";
    
    // Try to find a specific container first
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText.length > 100) { 
        jdText = el.innerText;
        break;
      }
    }

    // Fallback: If nothing specific found, grab the whole page text
    if (!jdText) {
      jdText = document.body.innerText || "";
    }

    // --- 2. GET COMPANY ---
    let company = "";
    const meta = document.querySelector('meta[property="og:site_name"]');
    if (meta) company = meta.content;
    if (!company) {
      const el = document.querySelector('.topcard__org-name-link, .employerName, .company, h1');
      if (el) company = el.innerText.trim();
    }

    // --- 3. SEND BACK ---
    sendResponse({ 
      company: company || "",
      jdText: jdText.substring(0, 15000), // Cap length to prevent errors
      url: window.location.href
    });
  }
});