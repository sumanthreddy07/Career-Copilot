const GAS_URL = 'https://script.google.com/macros/s/';
const GEMINI_MODEL = 'gemini-2.5-flash'; // Keeping the newer model

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.type === 'GENERATE_RESUME') {
    (async () => {
      try {
        await processGeneration(request);
        sendResponse({ status: 'finished' });
      } catch (e) {
        sendResponse({ status: 'failed', error: e?.message || String(e) });
      }
    })();

    // CRITICAL: keeps MV3 service worker alive for async work
    return true;
  }

  if (request.type === 'LOG_JOB') {
    (async () => {
      try {
        await logJobToSheet(request.payload);
        sendResponse({ status: 'logging_finished' });
      } catch (e) {
        sendResponse({ status: 'logging_failed', error: e?.message || String(e) });
      }
    })();
    return true;
  }
});


// background.js

// background.js

async function processGeneration(data) {
  const { tabId, prompt, resume, details, format, jd, apiKey } = data;
  const storageKey = `state_${tabId}`;

  // Helper: merge + persist patch into state
  const setState = async (patch) => {
    const s = await chrome.storage.local.get(storageKey);
    const state = s[storageKey] || {};
    Object.assign(state, patch);
    await chrome.storage.local.set({ [storageKey]: state });
  };

  // Helper: progress updates (doesn't touch isGenerating)
  const updateProgress = async (msg) => {
    await setState({ progressMessage: msg });
  };

  // Mark generating right away (so UI always reflects it)
  await setState({ isGenerating: true, error: null, progressMessage: "Starting..." });

  try {
    // 1) CONFIRMATION
    await updateProgress("✅ Request Received. Preparing payload...");

    const MODEL_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    // 2) STATUS: Sending
    await updateProgress("🚀 Contacting Gemini AI... (This takes ~10-20s)");

    // Timeout Controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    const response = await fetch(MODEL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text:
                  `${prompt}\n\n` +
                  `MASTER RESUME: ${resume}\n\n` +
                  `DETAILED EXPERIENCE: ${details}\n\n` +
                  `PROJECT FORMAT: ${format}\n\n` +
                  `JD: ${jd}`
              }
            ]
          }
        ]
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // 3) STATUS: Parsing
    await updateProgress("📥 Response received! Parsing JSON...");

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const j = await response.json();

    if (!j.candidates || !j.candidates[0]?.content?.parts?.[0]?.text) {
      throw new Error("Empty response from Gemini");
    }

    let raw = j.candidates[0].content.parts[0].text;
    raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();

    let finalData;
    try {
      finalData = JSON.parse(raw);
    } catch {
      // Keep message generic since you said you can't do Fix 2 (shortening JD)
      throw new Error("Gemini returned invalid JSON. Please re-run.");
    }

    // 4) SAVE SUCCESS
    await setState({
      generatedData: finalData,
      timestamp: Date.now(),
      error: null,
      progressMessage: "Done!"
    });
  } catch (e) {
    console.error("BG Error:", e);

    await setState({
      error: e?.name === "AbortError" ? "Request Timed Out (60s)" : (e?.message || String(e)),
      progressMessage: "Failed"
    });
  } finally {
    // GUARANTEE UI never stays stuck
    await setState({ isGenerating: false });
  }
}


async function logJobToSheet(payload) {
  try {
    const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
    const json = await response.json();
    
    // Save result to storage so UI updates
    const stored = await chrome.storage.local.get(`state_${payload.tabId}`);
    const state = stored[`state_${payload.tabId}`] || {};
    state.logResult = { status: json.result, date: json.date, count: json.todayCount };
    await chrome.storage.local.set({ [`state_${payload.tabId}`]: state });

  } catch (e) {
    console.error("Log Error:", e);
  }
}

// Opens the Side Panel when you click the extension icon
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});