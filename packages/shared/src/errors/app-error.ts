export const APP_ERROR_CODES = {
  collectorUnavailable: 'COLLECTOR_UNAVAILABLE',
  collectorTimeout: 'COLLECTOR_TIMEOUT',
  collectorCommandRejected: 'COLLECTOR_COMMAND_REJECTED',
  collectorHandlerMissing: 'COLLECTOR_HANDLER_MISSING',
  collectorHandlerFailed: 'COLLECTOR_HANDLER_FAILED',
  collectorInvalidResponse: 'COLLECTOR_INVALID_RESPONSE',
  storageReadFailed: 'STORAGE_READ_FAILED',
  storageWriteFailed: 'STORAGE_WRITE_FAILED',
  invalidIpcRequest: 'INVALID_IPC_REQUEST',
  invalidIpcResponse: 'INVALID_IPC_RESPONSE',
  internalError: 'INTERNAL_ERROR',
} as const;

export type AppErrorCode = (typeof APP_ERROR_CODES)[keyof typeof APP_ERROR_CODES];

export interface SerializedAppError {
  id: string;
  code: AppErrorCode;
  message: string;
}

export class AppError extends Error {
  constructor(
    readonly id: string,
    readonly code: AppErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'AppError';
  }

  serialize(): SerializedAppError {
    return { id: this.id, code: this.code, message: this.message };
  }
}
