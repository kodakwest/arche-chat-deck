# Drift AI Chat Deck — Phase 2 Design Document

## Overview
This document outlines the UX flows, UI layouts, component structures, and technical edge cases for the Phase 2 feature set of the AgentFlow AI Chat Deck. The features build upon the existing single-file, zero-dependency, dark-themed Drift aesthetic.

---

## 1. THINKING / REASONING DISPLAY
**Objective**: Surface model-internal reasoning in chat bubbles, tapping into fields like `thoughtSignature` (Gemini), `reasoning_content` (OpenAI-compatible), or raw `<think>` tags.

### UX Flow
- **Happy Path**: The user toggles "Show Reasoning" to ON in the sidebar for Model A or Model B. When a message arrives, if the payload contains reasoning tokens, a collapsible thinking block appears above the main message text. The block defaults to collapsed to save vertical space. The user clicks it to expand and view the reasoning process.
- **Error/Edge State**: If the model doesn't support reasoning (or doesn't return any reasoning text), the thinking block is simply omitted from the render.

### UI Layout
- **Sidebar**: Add a toggle switch in the `#modelConfigContainer` under the active model tab.
- **Chat Window**: Leverage the existing `.thinking-container` and `.thinking-header` logic in `appendMessage()`.

### Component Sketch
```html
<!-- Sidebar Configuration Toggle -->
<div class="setting-group compact-row" style="margin-top: 8px;">
    <label class="setting-label" style="display: flex; justify-content: space-between; align-items: center; width: 100%; cursor: pointer;">
        <span>Capture Reasoning Tokens</span>
        <!-- Custom Drift toggle switch -->
        <input type="checkbox" id="showReasoningToggle" class="drift-toggle" checked>
    </label>
</div>
```

### Gotchas & Edge Cases
- **DeepSeek & Raw `<think>` Tags**: Some models (like DeepSeek R1 via OpenRouter) inject `<think>...</think>` directly into the `content` string rather than using a dedicated `reasoning_content` field. The parser needs a regex step to extract `(?<=<think>)(.*?)(?=</think>)` and strip it from the main message body if the explicit reasoning field is empty.
- **Streaming UI**: If streaming is implemented later, reasoning tokens stream first. The UI needs to explicitly show a "Thinking..." pulsing state in the `.thinking-container` before main content arrives.

---

## 2. SAVE OUTPUT LOCALLY
**Objective**: Export conversation history to disk as Markdown (human-readable) or JSON (machine-readable).

### UX Flow
- **Happy Path**: The user clicks "Export Session" in the sidebar. A small dropdown or split button prompts them to choose "Markdown" or "JSON". Upon selection, the browser generates a Blob URL and automatically downloads `drift_session_export_{timestamp}.md` or `.json`.
- **Error/Edge State**: If the conversation is empty, the button is either disabled or triggers a small Drift-themed toast/alert: "No context to export."

### UI Layout
- **Sidebar (Global Controls)**: Place this right below the existing "🗑 Clear Both Histories" button to group data-management actions together.

### Component Sketch
```html
<div class="compact-row" style="margin-top: 8px;">
    <button class="drift-btn drift-btn-secondary" id="exportMdBtn" style="width:100%; font-size:11px;">
        <svg>...</svg> Export MD
    </button>
    <button class="drift-btn drift-btn-secondary" id="exportJsonBtn" style="width:100%; font-size:11px;">
        <svg>...</svg> Export JSON
    </button>
</div>
```

### Gotchas & Edge Cases
- **Markdown Formatting**: Model A (teal) and Model B (violet) must be clearly distinguished in the text. Using Markdown blockquotes (e.g., `> **Model A (deepseek-v4):**`) will help maintain readability. Metadata (token usage, total cost, timestamp) must be appended to the top of the file as a YAML frontmatter block.
- **JSON Structure**: Ensure the JSON export includes raw system payloads, prompt configurations, and the exact values of the TARS Personality sliders at the time of export.

---

## 3. API CONNECTION TEST
**Objective**: Per-model connection validation directly from the configuration sidebar.

### UX Flow
- **Happy Path**: After entering an API Key and Base URL, the user clicks "Test Connection". The button shows a pulsing `...` state. A minimal API call (system prompt only, `max_tokens=1`) is sent. On success, the button momentarily turns `--accent-secondary` (green) and reads "Connected (124ms)", while the top HUD status dot updates.
- **Error/Edge State**: If the key is invalid or the URL is unreachable, the button turns `--accent-warning` (rose) and reads "Connection Failed". The Developer HUD Terminal auto-expands with the exact error trace.

### UI Layout
- **Sidebar**: Insert the button inside `#modelConfigContainer`, directly under the API Key and Base URL inputs.

### Component Sketch
```html
<div class="setting-group" style="margin-top: 4px;">
    <button class="drift-btn drift-btn-secondary" id="testConnectionBtn" style="font-size: 11px; padding: 6px;">
        <span class="test-icon">⚡</span> Test Connection
    </button>
</div>
```

### Gotchas & Edge Cases
- **Context Pollution**: The test call must *not* be appended to `conversationHistory`. It should be a completely isolated `fetch` call.
- **Cost**: To minimize accidental costs, pass `max_tokens: 1` in the payload for OpenAI-compatible APIs so the model doesn't generate a full paragraph just for a ping.

---

## 4. MODEL DISCOVERY
**Objective**: Dynamic model list fetching from provider APIs to populate the Engine Target dropdown.

### UX Flow
- **Happy Path**: When a user selects a provider (e.g., LM Studio or OpenRouter) and a valid base URL/key is present, the app calls `/v1/models`. The dropdown populates with the fetched models, cached in `localStorage` with a 24-hour expiry. A small refresh icon next to the dropdown allows manual re-fetching.
- **Error/Edge State**: If the network request fails (e.g., CORS error, invalid URL), the app silently falls back to the hardcoded `PROVIDER_MODELS` list and logs a warning in the Developer HUD.

### UI Layout
- **Sidebar**: Modify the `Active Engine Target` label to include a subtle refresh control.

### Component Sketch
```html
<div class="setting-group">
    <label class="setting-label" style="display:flex; justify-content:space-between;">
        Active Engine Target
        <span id="refreshModelsBtn" style="cursor:pointer; color:var(--accent-primary);" title="Fetch remote models">🔄</span>
    </label>
    <select class="setting-select" id="modelSelect">
        <!-- Dynamically populated -->
    </select>
</div>
```

### Gotchas & Edge Cases
- **List Size**: OpenRouter returns hundreds of models. A standard HTML `<select>` might become unwieldy. Consider either filtering the OpenRouter list to a curated subset, or implementing a simple `<datalist>` or custom searchable dropdown if the array length exceeds 50.
- **CORS Constraints**: LM Studio `/v1/models` requires the local server to have CORS enabled. Ensure the user is warned (via the HUD) if the fetch is blocked by browser security policies.

---

## 5. OPENAI OAUTH PROVIDER
**Objective**: Add OpenAI sign-in as a provider option without requiring manual API key copy-pasting.

### UX Flow
- **Happy Path**: User selects "OpenAI (OAuth)" from the API Mode dropdown. The API Key input is hidden and replaced by a "Sign In with OpenAI" button. Clicking it redirects the user to the OpenAI OAuth flow. Upon successful authentication, they are redirected back to the app with an access token. The token is saved in `localStorage`, and the UI updates to "Authenticated as [User]".
- **Error/Edge State**: If the user denies authorization, or the token expires, the UI reverts to showing the "Sign In" button with an `--accent-warning` notice.

### UI Layout
- **Sidebar**: Rendered inside `#modelConfigContainer` when the specific provider is selected.

### Component Sketch
```html
<div class="setting-group" id="oauthContainer">
    <button class="drift-btn drift-btn-primary" id="openAiSignInBtn" style="width: 100%;">
        <svg viewBox="0 0 24 24" style="width:14px; height:14px; margin-right:8px;"><!-- OpenAI Logo --></svg>
        Sign in with OpenAI
    </button>
</div>
```

### Gotchas & Edge Cases
- **The `file://` Protocol Problem**: The existing app is designed to run locally from a `file://` URI. Standard OAuth 2.0 flows (Authorization Code) strictly forbid `file://` redirect URIs. 
    - *Workaround A*: Utilize the optional `relay-server.js` to handle the OAuth callback, which then passes the token back to the frontend.
    - *Workaround B*: Use a centralized hosted callback page (e.g., on AgentFlow's domain) that captures the token and provides a deep-link or a manual "Copy your token" button for the user to paste back into the local `file://` app.
- **API Compatability**: Once authenticated, the bearer token can be passed to `https://api.openai.com/v1/chat/completions` exactly like the existing OpenRouter/LM Studio logic.
