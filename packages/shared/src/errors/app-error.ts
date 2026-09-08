export interface SerializedAppError {
  id: string;
  code: string;
  message: string;
}

export class AppError extends Error {
  constructor(
    readonly id: string,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }

  serialize(): SerializedAppError {
    return { id: this.id, code: this.code, message: this.message };
  }
}
