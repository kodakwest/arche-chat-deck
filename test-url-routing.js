const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const htmlPath = path.join(__dirname, 'drift_chat_suite.html');
const html = fs.readFileSync(htmlPath, 'utf8');

function extractConst(name) {
    const start = html.indexOf(`const ${name} =`);
    assert.notEqual(start, -1, `Missing const ${name}`);
    const end = html.indexOf(';', start);
    assert.notEqual(end, -1, `Missing semicolon for const ${name}`);
    return html.slice(start, end + 1).replace(/^const /, 'var ');
}

function extractFunction(name) {
    const signature = `function ${name}(`;
    const start = html.indexOf(signature);
    assert.notEqual(start, -1, `Missing function ${name}`);

    const bodyStart = html.indexOf('{', start);
    assert.notEqual(bodyStart, -1, `Missing body for function ${name}`);

    let depth = 0;
    for (let index = bodyStart; index < html.length; index += 1) {
        const char = html[index];
        if (char === '{') depth += 1;
        if (char === '}') depth -= 1;
        if (depth === 0) return html.slice(start, index + 1);
    }

    throw new Error(`Could not extract complete function ${name}`);
}

const storage = new Map();
const sandbox = {
    localStorage: {
        getItem(key) {
            return storage.has(key) ? storage.get(key) : null;
        },
        setItem(key, value) {
            storage.set(key, String(value));
        }
    }
};
vm.createContext(sandbox);

const routingSource = [
    extractConst('OPENCODE_GO_UPSTREAM_BASE_URL'),
    extractConst('RELAY_BASE'),
    extractConst('OPENCODE_GO_PROXY_BASE_URL'),
    extractConst('PROVIDER_BASE_URLS'),
    extractConst('PROVIDER_MODELS'),
    extractFunction('providerUsesBaseUrl'),
    extractFunction('getProviderDefaultBaseUrl'),
    extractFunction('loadBaseUrlForModel'),
    extractFunction('isOpenCodeGoProxyUrl'),
    extractFunction('buildRequest'),
    extractFunction('buildEndpoint'),
    extractFunction('buildOpenCodeGoBody'),
    extractFunction('normalizeBaseUrl')
].join('\n\n');

vm.runInContext(routingSource, sandbox, { filename: 'drift_chat_suite.routing.js' });

assert.equal(storage.size, 0, 'Test must start with no localStorage state');

const modelB = {
    provider: 'simulate',
    model: 'qwen-35b-coder',
    systemPrompt: '',
    key: '',
    baseUrl: 'http://localhost:1234/v1'
};

modelB.provider = 'opencode-go';
modelB.model = sandbox.PROVIDER_MODELS[modelB.provider][0];
modelB.key = 'test-key';
modelB.baseUrl = sandbox.loadBaseUrlForModel('B', modelB.provider);

assert.equal(modelB.baseUrl, 'http://127.0.0.1:8787/opencode-go/v1');
assert.equal(sandbox.providerUsesBaseUrl('opencode-go'), false);

const request = sandbox.buildRequest(
    modelB.provider,
    modelB.model,
    modelB,
    [
        { role: 'system', content: 'system' },
        { role: 'user', content: 'hello' }
    ],
    'system'
);

assert.equal(request.endpoint, 'http://127.0.0.1:8787/opencode-go/v1/chat/completions');
assert.equal(request.headers.Authorization, 'Bearer test-key');
assert.equal(request.headers['x-drift-upstream-base'], 'https://opencode.ai/zen/go/v1');
assert.equal(request.body.model, modelB.model);

modelB.baseUrl = sandbox.OPENCODE_GO_PROXY_BASE_URL;
const proxyStateRequest = sandbox.buildRequest(
    modelB.provider,
    modelB.model,
    modelB,
    [{ role: 'user', content: 'hello again' }],
    'system'
);

assert.equal(proxyStateRequest.endpoint, 'http://127.0.0.1:8787/opencode-go/v1/chat/completions');

console.log('PASS: Model B OpenCode Go routes through http://127.0.0.1:8787/opencode-go/v1/chat/completions');
