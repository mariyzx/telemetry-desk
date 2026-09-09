export { SystemClock } from './clock/system-clock.js';
export {
  CollectorProtocolClient,
  CollectorProtocolHost,
} from './process-transport/collector-protocol-session.js';
export type {
  CollectorProtocolClientOptions,
  LineTransport,
} from './process-transport/collector-protocol-session.js';
export { decodeNdjsonChunk, encodeNdjsonLine } from './process-transport/ndjson-framing.js';
