# AgentFlow AI Chat Deck

Dual-model adversarial conversation engine — two independently configured AI models conversing automatically with user injection controls, token tracking, and real-time activity indicators.

## Features

- **Dual-Model Adversarial Loop** — Model A → Model B → Model A… automated turn-taking with configurable turn limits and delay
- **Multi-Provider** — 5 providers: OpenCode Go, OpenRouter, LM Studio, Gemini, Simulate
- **Per-Model Configuration** — Independent provider, model, system prompt per agent
- **Real-Time Activity Indicators** — Live bouncing dots, token counters, latency display, elapsed timer during API calls
- **Turn Handoff Bar** — Visual A→B speaker track with pulsing dot, color morphing arrow, countdown timer
- **Thinking/Reasoning Display** — Collapsible reasoning blocks from API responses
- **Token Tracking** — Per-turn and cumulative token counts with cost estimation
- **User Injection** — Pause the loop and inject prompts to Model A, Model B, or both
- **Export** — Save conversations as Markdown or JSON
- **Debug Terminal** — Raw request/response payloads, token flow, latency logs
- **Cost Cap** — Configurable budget limit auto-halts the loop

## Architecture

```
app.agentflow.com/drift*  → CF Pages (HTML artifact)
drift-api.agentflow.com   → CF Worker (CORS relay → OpenCode Go)
```

**Local development:**
- `drift_chat_suite.html` — Single HTML file, all CSS/JS inline, no build step
- `relay-server.js` — Node.js CORS proxy for OpenCode Go (`node relay-server.js`)
- `workers/relay-worker.js` — Cloudflare Worker relay (production)

## Quick Start

1. **Open locally:** Open `drift_chat_suite.html` in your browser (works from `file://` for LM Studio, OpenRouter, Gemini, Simulate)
2. **For OpenCode Go:** Start the relay — `node relay-server.js` — then open `http://127.0.0.1:8787/drift_chat_suite.html`
3. **Configure models:** Select provider + model + system prompt in the sidebar for Model A and Model B
4. **Start the loop:** Enter a seed prompt and click Start

## Providers

| Provider | Local Relay Needed | API Key |
|----------|-------------------|---------|
| LM Studio | No | None (local) |
| OpenCode Go | Yes (relay-server.js) | In app |
| OpenRouter | No | In app |
| Gemini | No | In app |
| Simulate | No | None (mock) |

## Project Structure

```
agentflow-ai-chat-deck/
├── drift_chat_suite.html          # Main application (single file)
├── relay-server.js                # Local CORS relay (Node.js)
├── workers/
│   ├── relay-worker.js            # Cloudflare Worker relay
│   └── wrangler.toml              # Worker deployment config
├── wrangler.toml                  # Pages deployment config
├── AGENTS.md                      # Design conventions
├── test-url-routing.js            # URL routing tests
├── test-relay-server.js           # Relay integration tests
└── test/opencode_go_request.test.mjs  # Request routing tests
```

## Design

Dark theme with glassmorphism. Model A in teal (`#22d3ee`), Model B in violet (`#818cf8`). See `AGENTS.md` for full design conventions.

## Deployment

```bash
# Deploy Worker relay
cd workers && wrangler deploy

# Deploy Pages app
wrangler pages deploy . --project-name agentflow-ai-chat-deck
```

## License

MIT
