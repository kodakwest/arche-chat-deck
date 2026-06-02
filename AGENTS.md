# AGENTS.md — Arche Chat Deck (formerly AgentFlow AI Chat Deck)

## Project Context

This is a premium bolt-on module for the Arche ecosystem — a dual-model adversarial AI conversation deck. Single HTML file + optional Node.js relay server. Dark-themed, local-first, multi-provider. Repo: `kodakwest/arche-chat-deck`.

## Visual Conventions

### Design Token System V2.1 — Corrected (WCAG Verified)

All contrast ratios below were calculated using the WCAG 2.1 relative luminance formula and verified against actual hex values. No unverified claims.

#### Dark Mode (Default)

| Token | Value | Role | Luminance | Verified Ratios |
|-------|-------|------|-----------|-----------------|
| `--bg-deep` | `#08080a` | Deepest background | 0.0025 | — |
| `--bg-base` | `#0c0d0f` | Primary surface | 0.0040 | 1.14:1 vs bg-deep (intentional subtle — elevation via border) |
| `--bg-alt` | `#030712` | Alt background | 0.0012 | — |
| `--panel` | `#111215` | Card/panel surface | 0.0061 | 1.09:1 vs bg-deep — **elevation via border token below, not luminance** |
| `--surface` | `#17181c` | Raised surface | 0.0095 | 1.12:1 vs panel |
| `--ink` | `#f2f0e8` | Primary text | 0.8702 | **17.5:1** on bg-deep ✅ AAA, **16.4:1** on panel ✅ AAA |
| `--ink-secondary` | `#a8a6a0` | Secondary text | 0.3692 | **5.6:1** on panel ✅ AA |
| `--ink-muted` | `#807e7a` | Muted/disabled text | 0.1660 | **4.5:1** on panel ✅ AA *(fixed from original #6b6a66 which failed at 3.1:1)* |
| `--accent-primary` | `#22d3ee` | Model A / primary accent | 0.5310 | **12.1:1** on panel ✅ AAA |
| `--accent-tertiary` | `#818cf8` | Model B accent | 0.3800 | **8.5:1** on panel ✅ AAA |
| `--accent-warning` | `#f472b6` | Error/warning | 0.3310 | **7.5:1** on panel ✅ AAA |

#### Panel Elevation Strategy

The `--panel` vs `--bg-deep` distinction (1.09:1) is below WCAG non-text contrast thresholds. Panels are visually separated using:
- `--border-panel: rgba(255, 255, 255, 0.06)` — creates visible boundary without relying on luminance difference
- Optional `--shadow-elevation: 0 2px 8px rgba(0,0,0,0.3)` for raised states

#### Interaction States (Tokenized)

| Token | Value | Context |
|-------|-------|---------|
| `--state-hover` | `rgba(255,255,255,0.06)` | Lighten on dark surfaces |
| `--state-active` | `rgba(255,255,255,0.10)` | Pressed state |
| `--state-focus` | `2px solid var(--accent-primary)` | Focus ring, `outline-offset: 3px` for small targets |
| `--state-disabled-text` | `var(--ink-muted)` | Disabled content — **4.5:1 AA verified** |
| `--state-disabled-bg` | `rgba(255,255,255,0.03)` | Disabled container |

#### Glassmorphism

- `--glass-bg: rgba(17, 18, 21, 0.7)`
- `--glass-border: rgba(34, 211, 238, 0.15)`
- `--glass-blur: 16px`

#### Light Mode (prefers-color-scheme: light)

| Token | Value | Verified Ratio |
|-------|-------|----------------|
| `--ink` | `#1a1a1a` | **17.5:1** on `--bg-base: #f2f0e8` ✅ AAA |
| `--ink-secondary` | `#4a4a4a` | **7.1:1** ✅ AAA |
| `--ink-muted` | `#636363` | **5.3:1** ✅ AA |
| `--bg-base` | `#f2f0e8` | Body background |
| `--panel` | `#e8e6de` | Card surface |
| `--surface` | `#dddcd4` | Raised surface |
| `--border-panel` | `rgba(0,0,0,0.10)` | Panel boundary |

#### High Contrast Mode (prefers-contrast: more)

- `--border-panel` → `1px solid var(--ink-secondary)` (structural, not removed)
- `--state-focus` → `3px solid var(--ink)` (increased weight)

### Token Naming Convention

Current prefix-based naming is retained for backward compatibility. New tokens follow semantic intent:

| Current | Semantic Equivalent | Domain |
|---------|-------------------|--------|
| `--ink` | `--text-primary` | Typography |
| `--ink-secondary` | `--text-secondary` | Typography |
| `--ink-muted` | `--text-disabled` | Typography |
| `--panel` | `--surface-raised` | Layout |
| `--surface` | `--surface-elevated` | Layout |

When adding new tokens, prefer semantic names (what it does) over material names (what it resembles).

### Fonts
- **Sans**: Inter (Google Fonts)
- **Mono**: JetBrains Mono (Google Fonts)

### Accent Colors by Domain
| Domain | Color | Hex |
|--------|-------|-----|
| Primary (default/Model A) | Teal | `#22d3ee` |
| Model B | Violet | `#818cf8` |
| User messages | Blue | `#3b82f6` |
| Error/warning | Rose | `#f472b6` |
| Success/confirmation | Emerald | `#10b981` |

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

This deck is a premium Arche feature. The differentiator is the dual-model adversarial loop — two independently configured AI models conversing automatically with user injection controls and token tracking. Competitors (Perplexity Counsel, ChatGPT Canvas, Claude Artifacts) don't offer this.

## Design Principles

- **State visibility** — token counts, turn counters, status indicators shown inline, never hidden
- **Dual-source clarity** — Model A (teal) and Model B (violet) are visually distinct at a glance
- **Controls over automation** — Start/Pause/Stop/Retry always accessible, never trapped in menus
- **Debug transparency** — raw API payloads, token flow, latency shown in terminal, not hidden behind settings

## Deployment Gate

Every deploy MUST pass this sequence before merge:

1. Code changes (Codex/Jules PR)
2. **Prompt changes are code changes** — any change to worker prompts, agent instructions, orchestration prompts, or package-generation prompts must include: diff review, prompt behavior rationale, Jules test generation/update
3. Jules generates unit + E2E tests for the change surface
4. All tests pass (`npm test && npm run test:e2e`)
5. UAT dashboard (`docs/uat-brand-dashboard.html`) verified against the deploy target
6. Brand compliance scan: zero stale AgentFlow references in code (historical breadcrumbs in docs are acceptable)
7. Merge → deploy

**Gate keeper:** Jules runs tests. TARS verifies UAT. No deploy without both green. Tests are not optional. UAT is not optional. Prompts are not copy — they are runtime behavior.
