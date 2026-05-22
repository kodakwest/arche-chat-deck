# AGENTS.md — AgentFlow AI Chat Deck

## Project Context

This is a premium bolt-on module for AgentFlow — a dual-model adversarial AI conversation deck. Single HTML file + optional Node.js relay server. Dark-themed, local-first, multi-provider.

## Visual Conventions

- **Dark theme**: background `#08080a` / `#0c0d0f`, panels `#111215`, ink `#f2f0e8`
- **Model A accent**: `#22d3ee` (teal, `--accent-primary`)
- **Model B accent**: `#818cf8` (violet, `--accent-tertiary`)
- **User accent**: `#3b82f6` (blue)
- **Error/warning**: `#f472b6` (rose, `--accent-warning`)
- **Fonts**: Inter (sans), JetBrains Mono (mono) — Google Fonts
- **Glassmorphism**: `rgba(17, 18, 21, 0.7)` bg with `blur(16px)`
- **No build step** — pure HTML/CSS/JS, zero dependencies
- **Markdown rendering**: marked.js from CDN

## Architecture

- Single HTML file (`drift_chat_suite.html`) — all CSS and JS inline
- Optional relay server (`relay-server.js`) for CORS-free browser access
- localStorage for config persistence
- 5 providers: simulate, opencode-go, openrouter, lmstudio, gemini

## Output Requirements

- Responsive design (mobile-aware via media queries at 980px)
- All features work from `file://` protocol (with relay for OpenCode Go)
- Telegram-ready: output readable at 1200px width
- Links use `target="_blank"` for external

## Feature Intent

This deck is a premium AgentFlow feature. The differentiator is the dual-model adversarial loop — two independently configured AI models conversing automatically with user injection controls and token tracking. Competitors (Perplexity Counsel, ChatGPT Canvas, Claude Artifacts) don't offer this.

## Design Principles

- **State visibility** — token counts, turn counters, status indicators shown inline, never hidden
- **Dual-source clarity** — Model A (teal) and Model B (violet) are visually distinct at a glance
- **Controls over automation** — Start/Pause/Stop/Retry always accessible, never trapped in menus
- **Debug transparency** — raw API payloads, token flow, latency shown in terminal, not hidden behind settings
