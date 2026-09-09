import { randomUUID } from 'node:crypto';
import {
  CachedGetGatewayStatusService,
  GatewaySamplePipeline,
  GetGatewayStatusService,
  NetworkSamplePersistenceQueue,
  type NetworkSample,
} from '@telemetry-desk/application';
import { GATEWAY_RING_BUFFER_CAPACITY, RingBuffer } from '@telemetry-desk/domain';
import {
  openSqliteDatabase,
  resolveDatabasePath,
  SqliteNetworkSampleRepository,
  SystemClock,
} from '@telemetry-desk/infrastructure';
import { createNetworkPorts } from './create-network-ports.js';
import { runCollector } from './run-collector.js';

const clock = new SystemClock();
const networkPorts = createNetworkPorts(process.platform);
const gatewayProbe = new GetGatewayStatusService(
  clock,
  networkPorts.gatewayResolver,
  networkPorts.networkProbe,
);
const gatewayStatusService = new CachedGetGatewayStatusService(gatewayProbe);

const dbPath = resolveDatabasePath();
const database = openSqliteDatabase(dbPath);
const repository = new SqliteNetworkSampleRepository(database);
const ringBuffer = new RingBuffer<NetworkSample>(GATEWAY_RING_BUFFER_CAPACITY);
const persistenceQueue = new NetworkSamplePersistenceQueue(repository);
const samplePipeline = new GatewaySamplePipeline({
  buffer: ringBuffer,
  queue: persistenceQueue,
  createId: () => randomUUID(),
});

let stopping = false;

async function shutdown(): Promise<void> {
  if (stopping) {
    return;
  }
  stopping = true;
  stop();
  try {
    await samplePipeline.flush();
  } finally {
    database.close();
  }
  process.exit(0);
}

const stop = runCollector({
  stdin: process.stdin,
  stdout: process.stdout,
  clock,
  gatewayStatus: gatewayStatusService,
  onGatewaySample: (status) => {
    samplePipeline.record(status);
  },
  persistenceFlush: () => samplePipeline.flush(),
  onShutdown: () => shutdown(),
});

process.on('SIGTERM', () => {
  void shutdown();
});

process.on('SIGINT', () => {
  void shutdown();
});
