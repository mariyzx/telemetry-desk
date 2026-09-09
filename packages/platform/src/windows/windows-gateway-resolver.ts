import type { GatewayResolverPort } from '@telemetry-desk/application';
import { runCommand, type CommandRunner } from '../common/command-runner.js';

const DEFAULT_ROUTE =
  /^\s*0\.0\.0\.0\s+0\.0\.0\.0\s+(\d{1,3}(?:\.\d{1,3}){3})\s+\d{1,3}(?:\.\d{1,3}){3}\s+\d+\s*$/m;

export class WindowsGatewayResolver implements GatewayResolverPort {
  constructor(private readonly commandRunner: CommandRunner = runCommand) {}

  async resolve(): Promise<string | null> {
    try {
      const result = await this.commandRunner('route', ['print', '-4']);
      if (result.exitCode !== 0) {
        return null;
      }

      const match = DEFAULT_ROUTE.exec(result.stdout);
      return match?.[1] ?? null;
    } catch {
      return null;
    }
  }
}
