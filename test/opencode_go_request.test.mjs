import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const projectRoot = path.resolve(import.meta.dirname, '..');
const htmlPath = path.join(projectRoot, 'drift_chat_suite.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);

assert.ok(scriptMatch, 'Expected drift_chat_suite.html to contain an inline script');

const source = scriptMatch[1];

function extractConst(name) {
    const match = source.match(new RegExp(`const ${name} = ([\\s\\S]*?);\\n`));
    assert.ok(match, `Expected to extract const ${name}`);
    return `const ${name} = ${match[1]};`;
}

function extractFunction(name) {
    const marker = `function ${name}(`;
    let start = source.indexOf(marker);
    assert.notEqual(start, -1, `Expected to extract function ${name}`);
    if (source.slice(start - 6, start) === 'async ') start -= 6;

    const bodyStart = source.indexOf('{', start);
    let depth = 0;
    for (let i = bodyStart; i < source.length; i += 1) {
        if (source[i] === '{') depth += 1;
        if (source[i] === '}') depth -= 1;
        if (depth === 0) return source.slice(start, i + 1);
    }

    assert.fail(`Could not find end of function ${name}`);
}

const extractedSource = [
    extractConst('OPENCODE_GO_UPSTREAM_BASE_URL'),
    extractConst('RELAY_BASE'),
    extractConst('OPENCODE_GO_PROXY_BASE_URL'),
    extractConst('PROVIDER_BASE_URLS'),
    extractFunction('getProviderDefaultBaseUrl'),
    extractFunction('isOpenCodeGoProxyUrl'),
    extractFunction('normalizeBaseUrl'),
    extractFunction('buildEndpoint'),
    extractFunction('buildOpenCodeGoBody'),
    extractFunction('buildRequest'),
    extractFunction('callModel'),
    `
    globalThis.extracted = {
        buildRequest,
        getProviderDefaultBaseUrl,
        normalizeBaseUrl,
        callModel
    };
    `
].join('\n\n');

let capturedFetchUrl = '';
const context = {
    modelState: {
        B: {
            provider: 'opencode-go',
            model: 'deepseek-v4-flash',
            key: 'test-key',
            baseUrl: 'http://127.0.0.1:8787/opencode-go/v1'
        }
    },
    conversationHistory: {
        B: [{ role: 'user', content: 'hello' }]
    },
    latencyStat: { innerText: '' },
    loopState: { turn: 1 },
    buildSystemPrompt: () => 'system prompt',
    estimateTokens: () => 1,
    calculateCost: () => 0,
    logTokenUsage: () => {},
    parseResponse: () => ({ reply: 'ok', thoughts: '', promptTokens: 1, completionTokens: 1 }),
    fetch: async (url) => {
        capturedFetchUrl = url;
        return {
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'ok' } }],
                usage: { prompt_tokens: 1, completion_tokens: 1 }
            })
        };
    }
};

vm.createContext(context);
vm.runInContext(extractedSource, context, { filename: htmlPath });

const {
    buildRequest,
    getProviderDefaultBaseUrl,
    normalizeBaseUrl,
    callModel
} = context.extracted;

const expectedUpstreamBaseUrl = 'https://opencode.ai/zen/go/v1';
const expectedProxyBaseUrl = 'http://127.0.0.1:8787/opencode-go/v1';
const expectedEndpoint = `${expectedProxyBaseUrl}/chat/completions`;
const staleProxyBaseUrl = 'http://127.0.0.1:8787/opencode-go/v1';
const messages = [
    { role: 'system', content: 'system prompt' },
    { role: 'user', content: 'hello' }
];

assert.equal(getProviderDefaultBaseUrl('opencode-go'), expectedProxyBaseUrl);
assert.equal(normalizeBaseUrl('', 'opencode-go'), expectedProxyBaseUrl);

const request = buildRequest(
    'opencode-go',
    'deepseek-v4-flash',
    { key: 'test-key', baseUrl: staleProxyBaseUrl },
    messages,
    'system prompt'
);

assert.equal(request.endpoint, expectedEndpoint);
assert.ok(request.endpoint.startsWith(expectedProxyBaseUrl));
assert.equal(request.headers['x-drift-upstream-base'], expectedUpstreamBaseUrl);

await callModel('B');

assert.equal(capturedFetchUrl, expectedEndpoint);
