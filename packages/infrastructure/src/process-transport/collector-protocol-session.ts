import {
  AppError,
  COLLECTOR_COMMANDS,
  COLLECTOR_EVENTS,
  collectorEventSchema,
  collectorRequestSchema,
  collectorResponseSchema,
  isAllowlistedCollectorCommand,
  type CollectorCommand,
  type SerializedAppError,
} from '@telemetry-desk/shared';
import { encodeNdjsonLine } from './ndjson-framing.js';

export interface LineTransport {
  write: (line: string) => void;
  onLine: (listener: (line: string) => void) => void;
}

export interface CollectorProtocolClientOptions extends LineTransport {
  createId: () => string;
  requestTimeoutMs?: number;
}

type CommandHandler = (payload: Record<string, unknown>) => Promise<unknown>;

export class CollectorProtocolClient {
  private readonly pending = new Map<
    string,
    {
      resolve: (payload: unknown) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  private readonly heartbeatListeners = new Set<(payload: { monotonicMs: number }) => void>();
  private readonly requestTimeoutMs: number;

  constructor(private readonly options: CollectorProtocolClientOptions) {
    this.requestTimeoutMs = options.requestTimeoutMs ?? 5_000;
    options.onLine((line) => {
      this.handleIncoming(line);
    });
  }

  onHeartbeat(listener: (payload: { monotonicMs: number }) => void): () => void {
    this.heartbeatListeners.add(listener);
    return () => {
      this.heartbeatListeners.delete(listener);
    };
  }

  async request(
    command: CollectorCommand,
    payload: Record<string, unknown> = {},
  ): Promise<unknown> {
    if (!isAllowlistedCollectorCommand(command)) {
      throw new AppError(
        'collector-command',
        'COLLECTOR_COMMAND_REJECTED',
        'command not allowlisted',
      );
    }

    const id = this.options.createId();
    const request = collectorRequestSchema.parse({
      type: 'request',
      id,
      command,
      payload,
    });

    return await new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new AppError(id, 'COLLECTOR_TIMEOUT', 'collector request timed out'));
      }, this.requestTimeoutMs);

      this.pending.set(id, { resolve, reject, timer });
      this.options.write(encodeNdjsonLine(request));
    });
  }

  private handleIncoming(line: string): void {
    const raw: unknown = JSON.parse(line);

    const asEvent = collectorEventSchema.safeParse(raw);
    if (asEvent.success) {
      for (const listener of this.heartbeatListeners) {
        listener(asEvent.data.payload);
      }
      return;
    }

    const asResponse = collectorResponseSchema.safeParse(raw);
    if (!asResponse.success) {
      return;
    }

    const pending = this.pending.get(asResponse.data.id);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timer);
    this.pending.delete(asResponse.data.id);

    if (asResponse.data.ok) {
      pending.resolve(asResponse.data.payload);
      return;
    }

    pending.reject(
      new AppError(
        asResponse.data.error.id,
        asResponse.data.error.code,
        asResponse.data.error.message,
      ),
    );
  }
}

export class CollectorProtocolHost {
  private readonly handlers = new Map<CollectorCommand, CommandHandler>();

  constructor(private readonly transport: LineTransport) {
    transport.onLine((line) => {
      void this.handleIncoming(line);
    });
  }

  setHandler(command: CollectorCommand, handler: CommandHandler): void {
    this.handlers.set(command, handler);
  }

  sendHeartbeat(monotonicMs: number): void {
    const event = collectorEventSchema.parse({
      type: 'event',
      name: COLLECTOR_EVENTS.heartbeat,
      payload: { monotonicMs },
    });
    this.transport.write(encodeNdjsonLine(event));
  }

  private async handleIncoming(line: string): Promise<void> {
    let raw: unknown;
    try {
      raw = JSON.parse(line) as unknown;
    } catch {
      return;
    }

    const parsed = collectorRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return;
    }

    const handler = this.handlers.get(parsed.data.command);
    if (!handler) {
      this.writeError(parsed.data.id, {
        id: parsed.data.id,
        code: 'COLLECTOR_HANDLER_MISSING',
        message: `no handler for ${parsed.data.command}`,
      });
      return;
    }

    try {
      const payload = await handler(parsed.data.payload);
      this.transport.write(
        encodeNdjsonLine(
          collectorResponseSchema.parse({
            type: 'response',
            id: parsed.data.id,
            ok: true,
            payload,
          }),
        ),
      );
    } catch (error) {
      this.writeError(parsed.data.id, serializeHostError(error));
    }
  }

  private writeError(id: string, error: SerializedAppError): void {
    this.transport.write(
      encodeNdjsonLine(
        collectorResponseSchema.parse({
          type: 'response',
          id,
          ok: false,
          error,
        }),
      ),
    );
  }
}

function serializeHostError(error: unknown): SerializedAppError {
  if (
    error &&
    typeof error === 'object' &&
    'serialize' in error &&
    typeof error.serialize === 'function'
  ) {
    return (error as { serialize: () => SerializedAppError }).serialize();
  }

  if (error instanceof Error) {
    return {
      id: 'collector-handler',
      code: 'COLLECTOR_HANDLER_FAILED',
      message: error.message,
    };
  }

  return {
    id: 'collector-handler',
    code: 'COLLECTOR_HANDLER_FAILED',
    message: 'unknown collector handler failure',
  };
}

export { COLLECTOR_COMMANDS };
