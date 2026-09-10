import { randomUUID } from 'node:crypto';
import {
  CachedGetGatewayStatusService,
  CreateManualTracePointService,
  DetectAutomaticTracePointsService,
  FinalizeOpenTracePointsService,
  GatewaySamplePipeline,
  GetGatewayStatusService,
  ListRecentTracePointsService,
  NetworkSamplePersistenceQueue,
  type NetworkSample,
} from '@telemetry-desk/application';
import { GATEWAY_RING_BUFFER_CAPACITY, RingBuffer } from '@telemetry-desk/domain';
import {
  openSqliteDatabase,
  resolveDatabasePath,
  SqliteNetworkSampleRepository,
  SqliteTracePointRepository,
  SystemClock,
} from '@telemetry-desk/infrastructure';
import {
  createManualTracePointResponseSchema,
  listTracePointsResponseSchema,
} from '@telemetry-desk/shared';
import { createNetworkPorts } from './create-network-ports.js';
import { runCollector } from './run-collector.js';
import { toTracePointSummary } from './to-trace-point-summary.js';

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
const networkSampleRepository = new SqliteNetworkSampleRepository(database);
const tracePointRepository = new SqliteTracePointRepository(database);
const ringBuffer = new RingBuffer<NetworkSample>(GATEWAY_RING_BUFFER_CAPACITY);
const persistenceQueue = new NetworkSamplePersistenceQueue(networkSampleRepository);
const samplePipeline = new GatewaySamplePipeline({
  buffer: ringBuffer,
  queue: persistenceQueue,
  createId: () => randomUUID(),
});

const createManualTracePointService = new CreateManualTracePointService({
  clock,
  repository: tracePointRepository,
  createId: () => randomUUID(),
  flushPendingSamples: () => samplePipeline.flush(),
});
const listRecentTracePointsService = new ListRecentTracePointsService(tracePointRepository);
const finalizeOpenTracePointsService = new FinalizeOpenTracePointsService(
  clock,
  tracePointRepository,
);
const detectAutomaticTracePointsService = new DetectAutomaticTracePointsService({
  clock,
  repository: tracePointRepository,
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
  onGatewaySample: async (status) => {
    samplePipeline.record(status);
    await detectAutomaticTracePointsService.execute(ringBuffer.toArray());
  },
  persistenceFlush: () => samplePipeline.flush(),
  createManualTracePoint: async () =>
    createManualTracePointResponseSchema.parse(
      toTracePointSummary(await createManualTracePointService.execute(ringBuffer.toArray())),
    ),
  listTracePoints: async (limit) =>
    listTracePointsResponseSchema.shape.data.parse({
      items: (await listRecentTracePointsService.execute(limit)).map(toTracePointSummary),
    }).items,
  finalizeOpenTracePoints: async () => {
    await finalizeOpenTracePointsService.execute();
  },
  onShutdown: () => shutdown(),
});

process.on('SIGTERM', () => {
  void shutdown();
});

process.on('SIGINT', () => {
  void shutdown();
});
