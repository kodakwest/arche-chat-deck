import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { startRelayServer } = require('./relay-server.js');

startRelayServer();
