const GAS_URL = 'https://script.google.com/macros/s/';
const GEMINI_MODEL = 'gemini-2.5-flash'; // Keeping the newer model
let CURRENT_TAB_ID = null;
let CACHE = { resume: "", details: "", format: "" };
let PAGE_URL = "";
// --- NEW MASTER PROMPT ---
const PROMPT_BASE = `
ROLE & OBJECTIVE:
Act as a Senior HR Recruiter and Resume Strategist with 20+ years of experience hiring Software Developers for top US tech companies (FAANG/MAANG, Fortune 500). 
Your goal is to align my work experience with a specific Job Description (JD) while prioritizing narrative flow and efficiency.
INPUTS:
1. MASTER RESUME (Skeleton)
2. DETAILED EXPERIENCE (Context/Metrics)

STRICT INSTRUCTIONS:
1. PRESERVATION FIRST (The "If it ain't broke, don't fix it" Rule):
   Before rewriting any bullet point, evaluate the existing bullet from the MASTER RESUME.
   * If the existing bullet already scores >85/100 for the JD (contains necessary keywords, strong metrics, and clear impact), PRESERVE IT exactly as is.
   * Only rewrite if the bullet lacks specific JD keywords, lacks impact, or is weak/passive.
   * Ensure every work experience includes high-impact, advanced projects that are realistic and relevant to the company and role.
   * Do not dump the job description into the resume. The rewritten experience must align with the exact responsibilities and qualifications mentioned in the job description, but it should not look forced or like I copied and pasted keywords. 
   * Every bullet point must be interview-explainable (STAR-ready), meaning it should feel like a real story I can confidently explain end-to-end. 
   * 

2. . NARRATIVE FLOW & ORDERING:
   * Do not provide a random list of "good points."
   * Arrange the bullet points in a logical "Story Arc" for the recruiter:
     - (If applicable) Start with Scope/Leadership (Team size, ownership, high-level impact).
     - Move to Technical Execution (Specific tech stack, hard skills, architecture).
     - End with Optimization/Metrics (Cost savings, efficiency, scale).
   * Ensure the transition between bullet points is non-repetitive and paints a complete picture of the candidate.

3. KEYWORD OPTIMIZATION:
   * For points that require rewriting, naturally incorporate at least 80% of the high-value keywords (hard skills, soft skills, and domain terminology) found in the JD into the resume.
   * Modify all my experience roles to strongly align with the job description, responsibilities, and required skills of the role I provide. 

4. ATS COMPLIANCE & FORMATTING:
   * You will be using a A4 Sheet with 1/2 inch border on left and right.
   * Use the STAR method (Situation, Task, Action, Result).
   * Optimize for F-pattern scanning: Start bullets with strong action verbs and high-impact metrics so a recruiter scanning the left margin catches the value immediately.
   * Start every bullet with a strong power verb.
   * Avoid "orphan words" (single words on a new line).
   * Ensure zero usage of personal pronouns (I, me, my).
   * Ensure the tone is human, professional, and not robotic gibberish.
   * Use ATS keyword strategy: 
     - If the job description says “design”, use design 
     - If it says “implemented”, use implemented 
     - If it says “developed”, use developed, etc. 
     - Mirror the exact wording naturally inside the bullets. 
     
5. DELIVERABLES:
  Part A: Microsoft Experience
  * Requirement: I need 6 "PRIMARY" final bullet points.
  * Your Task: Generate 6+3 distinct bullet points based on my Microsoft experience. The Bottom 3 are "ALTERNATIVE". For each ALTERNATIVE, you must identify which PRIMARY point it effectively replaces (e.g., if Primary #2 is weak, the Alternative replaces #2).
  * Rating System: Order them in descending order. For each point, provide a rating [Score: X/100] indicating how well it targets the JD and the potential impact, followed by a list of keywords responsible for why it got that score.
  * Example Output: "Spearheaded the migration of X... [Score: 95/100] - #Keyword1 #Keyword2 #Keyword3"

  Part B: Wells Fargo Experience
  * Requirement: I need 3 "PRIMARY" final bullet points.
  * Your Task: Generate 3+2 distinct bullet points based on my Microsoft experience. The Bottom 2 are "ALTERNATIVE". For each ALTERNATIVE, you must identify which PRIMARY point it effectively replaces (e.g., if Primary #2 is weak, the Alternative replaces #2).
  * Rating System Same as above (Rate out of 100 with keywords).

  Part C: Projects
  * Select my best 6 projects that align with the JD.
  * Rewrite them following the PROJECT FORMAT provided in the Inputs section.
  * Rating System Same as above (Rate out of 100 with keywords).

  Part D: Strategic Additions
  * Suggest 3-4 specific additions or tweaks to the resume (e.g., certifications, specific skill groupings) that would significantly increase hiring chances for this specific JD.
  * Rating System Same as above (Rate out of 100 with keywords).

Output: JSON Only.
Schema: 
{ 
  "microsoft": [
    {
      "bullet": "str", 
      "score": num, 
      "keywords": "str", 
      "type": "PRIMARY" | "ALTERNATIVE",
      "swaps_with": "Index of Primary point (1-6) this option replaces (or null if Primary)",
      "modification_status": "PRESERVED_ORIGINAL" | "OPTIMIZED_REWRITE",
      "reasoning": "Brief reason for decision" 
    }
  ],
  "wells_fargo": [
    {
      "bullet": "str", 
      "score": num, 
      "keywords": "str", 
      "type": "PRIMARY" | "ALTERNATIVE",
      "swaps_with": "Index of Primary point (1-6) this option replaces (or null if Primary)",
      "modification_status": "PRESERVED_ORIGINAL" | "OPTIMIZED_REWRITE",
      "reasoning": "Brief reason for decision"
    }
  ],
  "projects": [{"title": "str", "details": "str", "score": num, "keywords": "str"}],
  "strategic_additions": [{"bullet": "str", "score": num, "keywords": "str"}]
}
`;

// --- DOM ELEMENTS ---
const els = {
  comp: document.getElementById('comp'),
  pos: document.getElementById('pos'),
  stat: document.getElementById('stat'),
  jd: document.getElementById('jd'),
  note: document.getElementById('note'),
  count: document.getElementById('count'),
  docStatus: document.getElementById('docStatus'),
  status: document.getElementById('status'),
  genTime: document.getElementById('genTime'),
  res: document.getElementById('results'),
  sets: document.getElementById('settings'),
  apiKey: document.getElementById('apiKey'),
  saveKey: document.getElementById('saveKey'),
  loadDocsBtn: document.getElementById('loadDocsBtn'),
  logBtn: document.getElementById('logBtn'),
  tailorBtn: document.getElementById('tailorBtn')
};

// --- SAFE UPDATE HELPER ---
// This prevents the "Undefined" crash if HTML isn't ready
function updateStatus(msg, className = "") {
  if (els.status) {
    els.status.innerText = msg;
    els.status.className = className;
  }
}
function updateTime(msg) {
  if (els.genTime) {
    els.genTime.innerText = msg;
  }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
  console.log("🚀 Copilot Loading...");

  // 1. Get Current Tab ID
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  CURRENT_TAB_ID = tab.id;

  // 2. Load Global Settings
  const stored = await chrome.storage.local.get(['geminiKey', 'cachedDocs', 'docTime']);
  if (!stored.geminiKey) els.sets.style.display = 'block';

  // 3. Load Docs Cache
  if (stored.cachedDocs) {
    CACHE = stored.cachedDocs;
    els.docStatus.innerText = `Docs: ✅ ${stored.docTime}`;
  } else {
    els.docStatus.innerText = "Docs: ❌ Not Loaded";
  }

  // 4. Load Tab-Specific State
  await loadTabState(CURRENT_TAB_ID);

  // 5. Fetch Global Count
  fetchCount();
});

// --- TAB LISTENERS (FIXED FOR AUTO-LOAD) ---

// 1. Switch Tabs
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (CURRENT_TAB_ID) await saveTabState(CURRENT_TAB_ID);
  CURRENT_TAB_ID = activeInfo.tabId;
  await loadTabState(CURRENT_TAB_ID);
});

// 2. Page Reload / Navigation (THE BUG FIX)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only trigger if it's the tab we are looking at AND it finished loading
  if (tabId === CURRENT_TAB_ID && changeInfo.status === 'complete') {
    console.log("🔄 Page Reloaded. Re-scraping...");
    
    // Attempt to scrape fresh data
    try {
      const r = await chrome.tabs.sendMessage(tabId, {type: 'GET_DATA'});
      if (r) {
        // Update UI with fresh data
        els.comp.value = r.company || "";
        els.jd.value = r.jdText || "";
        PAGE_URL = r.url || "";
        
        // Auto-save this new state
        saveTabState(CURRENT_TAB_ID);
      }
    } catch (e) {
      console.log("Scrape failed on reload (Content script might not inject on this page type).");
    }
  }
});

// --- STORAGE LISTENER (With Live Status Updates) ---
chrome.storage.onChanged.addListener((changes, namespace) => {
  const key = `state_${CURRENT_TAB_ID}`;
  if (changes[key]) {
    const newVal = changes[key].newValue;
    if (!newVal) return;

    // 1. CHECK GENERATION STATUS (Live Updates)
    if (newVal.isGenerating) {
        // ✨ This prints the live messages from background.js
        updateStatus(newVal.progressMessage || "Processing...", "");
        updateTime(""); // Clear time safely
    } 
    else if (newVal.generatedData && !newVal.isGenerating) {
        render(newVal.generatedData);
        updateStatus("Done!", "success");
        // Save Time Check
        if (newVal.timestamp) {
           const d = new Date(newVal.timestamp);
           updateTime(`Generated: ${d.toLocaleTimeString()}`);
        }
    } 
    else if (newVal.error) {
        updateStatus(`Error: ${newVal.error}`, "error");
    }

    // 2. CHECK LOGGING STATUS
    if (newVal.logResult) {
       if (newVal.logResult.status === 'duplicate') {
         updateStatus(`⚠️ Applied on ${newVal.logResult.date}`, "error");
       } else if (newVal.logResult.status === 'success') {
         updateStatus("✅ Logged!", "success");
         if(newVal.logResult.count && els.count) els.count.innerText = `Total: ${newVal.logResult.count}`;
       }
    }
  }
});

// --- STATE FUNCTIONS ---
async function saveTabState(tabId) {
  const key = `state_${tabId}`;
  const stored = await chrome.storage.local.get(key);
  const existing = stored[key] || {};

  const data = {
    ...existing,
    company: els.comp.value,
    position: els.pos.value,
    status: els.stat.value,
    jd: els.jd.value,
    notes: els.note.value,
    url: PAGE_URL
  };
  await chrome.storage.local.set({ [key]: data });
}

async function loadTabState(tabId) {
  if(els.comp) els.comp.value = ""; 
  if(els.jd) els.jd.value = ""; 
  if(els.note) els.note.value = ""; 
  if(els.res) els.res.innerHTML = ""; 
  updateStatus("");
  updateTime("");

  const key = `state_${tabId}`;
  const stored = await chrome.storage.local.get(key);
  let data = stored[key];

  if (data) {
    const SIX_HOURS = 6 * 60 * 60 * 1000;
    if (data.timestamp && (Date.now() - data.timestamp > SIX_HOURS)) {
      data.generatedData = null; 
      data.timestamp = null;
      await chrome.storage.local.set({ [key]: data });
    }

    if(els.comp) els.comp.value = data.company || "";
    if(els.pos) els.pos.value = data.position || "Software Engineer";
    if(els.stat) els.stat.value = data.status || "Applied";
    if(els.jd) els.jd.value = data.jd || "";
    if(els.note) els.note.value = data.notes || "";
    PAGE_URL = data.url || "";

    if (data.isGenerating) {
      updateStatus(data.progressMessage || "Starting...");
      const elapsed = Date.now() - (data.timestamp || Date.now());

      if (elapsed > 45000) { 
        if (els.status) {
          els.status.innerHTML = `${data.progressMessage} <br><a href="#" id="forceReset" style="color:red;">(Stuck? Reset)</a>`;
          setTimeout(() => {
            const rBtn = document.getElementById('forceReset');
            if(rBtn) rBtn.onclick = async (e) => {
              e.preventDefault();
              data.isGenerating = false;
              await chrome.storage.local.set({ [key]: data });
            };
          }, 100);
        }
      }
    } else if (data.generatedData) {
      render(data.generatedData);
      updateStatus("Restored from Cache", "success");
      
      if (data.timestamp) {
         const d = new Date(data.timestamp);
         updateTime(`Generated: ${d.toLocaleDateString()} ${d.toLocaleTimeString()}`);
      }
    }
    
    if (data.logResult && data.logResult.status === 'duplicate') {
        updateStatus(`⚠️ Applied on ${data.logResult.date}`, "error");
    }
  } else {
    try {
      const r = await chrome.tabs.sendMessage(tabId, {type: 'GET_DATA'});
      if(r) {
        if(els.comp) els.comp.value = r.company || "";
        if(els.jd) els.jd.value = r.jdText || "";
        PAGE_URL = r.url || "";
      }
    } catch(e) {}
  }
}

// Auto-Save Inputs
['input', 'change'].forEach(evt => {
  document.body.addEventListener(evt, () => {
    if(CURRENT_TAB_ID) saveTabState(CURRENT_TAB_ID);
  });
});

// --- BUTTON: GENERATE (TAILOR) ---
if (els.tailorBtn) {
  els.tailorBtn.onclick = async () => {
    if (!CACHE.resume) { alert("Load Documents first!"); return; }
    const k = await chrome.storage.local.get('geminiKey');
    if(!k.geminiKey) { alert("Enter API Key"); return; }

    updateStatus("Sending...", "");
    updateTime("");

    const key = `state_${CURRENT_TAB_ID}`;
    const stored = await chrome.storage.local.get(key);
    const currentState = stored[key] || {};
    
    await chrome.storage.local.set({ 
      [key]: { ...currentState, isGenerating: true, error: null, progressMessage: "Starting..." } 
    });

    chrome.runtime.sendMessage({
      type: 'GENERATE_RESUME',
      tabId: CURRENT_TAB_ID,
      prompt: PROMPT_BASE,
      resume: CACHE.resume,
      details: CACHE.details,
      format: CACHE.format,
      jd: els.jd ? els.jd.value : "",
      apiKey: k.geminiKey.trim()
    });
  };
}

if (els.logBtn) {
  els.logBtn.onclick = () => {
    updateStatus("Logging...", "");
    const payload = {
      company: els.comp ? els.comp.value : "",
      position: els.pos ? els.pos.value : "",
      status: els.stat ? els.stat.value : "",
      notes: els.note ? els.note.value : "",
      url: PAGE_URL, 
      applyDate: new Date().toLocaleDateString('en-CA'),
      tabId: CURRENT_TAB_ID 
    };
    chrome.runtime.sendMessage({ type: 'LOG_JOB', payload: payload });
  };
}

if (els.loadDocsBtn) {
  els.loadDocsBtn.onclick = async () => {
    const btn = els.loadDocsBtn;
    btn.disabled = true; btn.innerText = "🔄 Downloading...";
    try {
      const r = await fetch(GAS_URL); 
      const d = await r.json();
      if (d.masterResume) {
        CACHE = { resume: d.masterResume, details: d.detailedExperience, format: d.projectFormat };
        const now = new Date();
        const timeStr = `${now.getDate()}/${now.getMonth()+1} ${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`;
        await chrome.storage.local.set({ cachedDocs: CACHE, docTime: timeStr });
        if(els.docStatus) els.docStatus.innerText = `Docs: ✅ ${timeStr}`;
        if(els.count) els.count.innerText = `Total: ${d.todayCount}`;
        btn.innerText = "✅ Updated!";
      } else { throw new Error("Empty Data"); }
    } catch(e) { btn.innerText = "❌ Failed"; }
    setTimeout(() => { btn.disabled = false; btn.innerText = "🔄 Load Documents"; }, 2000);
  };
}

// --- RENDER FUNCTION (UPDATED FOR SWAP LOGIC) ---
function render(data) {
  els.res.innerHTML = "";
  
  const build = (title, list, isProject) => {
    if(!list || list.length === 0) return;
    let html = `<div style="color:#0b57d0; font-weight:bold; margin:15px 0 5px">${title}</div>`;
    
    list.forEach(item => {
      // 1. Badge Color & Text
      let badgeColor = "#e6f4ea"; // Green (Default Optimized)
      let badgeText = item.score || '';
      let statusIcon = "✨";

      if (item.modification_status === "PRESERVED_ORIGINAL") {
        badgeColor = "#f1f3f4"; // Grey
        statusIcon = "🛡️ Kept";
      }

      // 2. Handling "Alternative / Swap" Styling
      let swapHtml = "";
      if (item.type === "ALTERNATIVE") {
        badgeColor = "#fce8e6"; // Light Red/Orange for Alternative
        badgeText = item.score ? `${item.score}` : "Alt";
        // Create a visual indicator of what it swaps
        if (item.swaps_with) {
          swapHtml = `<div style="font-size:11px; background:#fff0e6; color:#b05c04; padding:2px 5px; border-radius:4px; margin-bottom:4px; display:inline-block; font-weight:bold;">
            🔄 Swaps with Point #${item.swaps_with}
          </div><br>`;
        }
      }

      // 3. Content Construction
      let content = isProject 
        ? `<b>${item.title}</b><br>${item.details}` 
        : item.bullet;
      
      let metaHtml = '';
      if (!isProject) {
        if (item.reasoning) metaHtml += `<div style="font-size:10px; color:#5f6368; margin-top:6px; font-style:italic;"><b>${statusIcon}:</b> ${item.reasoning}</div>`;
      }

      html += `<div class="card" onclick="navigator.clipboard.writeText(this.innerText)">
          <span class="badge" style="background:${badgeColor}">${badgeText}</span>
          <div>${swapHtml}${content}</div>
          ${metaHtml}
        </div>`;
    });
    els.res.innerHTML += html;
  };

  build("Microsoft", data.microsoft, false);
  build("Wells Fargo", data.wells_fargo, false);
  build("Projects", data.projects, true);
  build("Strategic Additions", data.strategic_additions, false);
}

// --- HELPERS ---
els.saveKey.onclick = () => {
  const k = els.apiKey.value;
  if(k) { chrome.storage.local.set({geminiKey: k.trim()}); els.sets.style.display='none'; }
};

async function fetchCount() {
  try {
    const r = await fetch(GAS_URL);
    const d = await r.json();
    els.count.innerText = `Total Applied Total: ${d.todayCount || 0}`;
  } catch(e) {}
}