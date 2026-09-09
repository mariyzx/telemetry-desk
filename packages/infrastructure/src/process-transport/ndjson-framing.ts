export function encodeNdjsonLine(value: unknown): string {
  return `${JSON.stringify(value)}\n`;
}

export function decodeNdjsonChunk(
  chunk: string,
  rest: string,
): { messages: unknown[]; rest: string } {
  const combined = `${rest}${chunk}`;
  const parts = combined.split('\n');
  const nextRest = parts.pop() ?? '';
  const messages: unknown[] = [];

  for (const part of parts) {
    if (part.length === 0) {
      continue;
    }

    messages.push(JSON.parse(part) as unknown);
  }

  return { messages, rest: nextRest };
}
