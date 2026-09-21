# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

TelemetryDesk — local, privacy-first Electron desktop app that samples network + machine health to tell apart slowness from the machine, Wi-Fi, ISP or external route. No account, no cloud, no outbound telemetry. Data stays in a local SQLite file. Primary target: Windows 10/11. User-facing UI strings are Brazilian Portuguese; code/identifiers are English.

## Commands

```bash
npm ci
npm run dev                    # build all workspaces, start Vite + Electron (apps/desktop/scripts/dev.mjs)
npm run verify                 # format:check + lint + typecheck + test + build — run before claiming done
npm test                       # all vitest projects
npm run build                  # ordered workspace build (domain → shared → application → platform → infrastructure → collector → dashboard → desktop)
npm run dist:win -w @telemetry-desk/desktop   # NSIS x64 installer into release/
```

Single test / subset:

```bash
npx vitest run packages/domain/src/metrics/ring-buffer.test.ts
npx vitest run --project collector          # projects: packages | dashboard | desktop | collector
npx vitest run -t 'name of the test'
```

Dashboard tests use their own config (`apps/dashboard/vitest.config.ts`, jsdom + Testing Library); everything else is node env. Node 22 only (`.nvmrc`, `engines`).

`npm run dev` deliberately rebuilds all workspace packages first — the desktop main process imports the packages' **compiled `dist/`**, so changes to `packages/*` or `apps/collector` are invisible until rebuilt.

## Architecture

Hexagonal, enforced by npm workspace dependency direction — never add an edge that reverses it:

```
domain          pure logic, zero deps (trace point lifecycle, gateway trigger detection, diagnosis classification, ring buffer)
shared          zod contracts + IPC channel names; the only thing both processes and the renderer share
application     use-case services + port interfaces (packages/application/src/ports/telemetry-ports.ts)
platform        OS-specific port implementations (windows/ linux/ macos/, dispatched by getPlatformCapabilities)
infrastructure  SQLite repositories, migrations, system clock, NDJSON process transport
```

`apps/*` are composition roots only — they wire ports to implementations. Business rules belong in `domain`/`application`.

### Three processes

1. **Electron main** (`apps/desktop/src/main`) — owns the window, tray, and a `collector-supervisor` that spawns, heartbeats, restarts with backoff, and degrades the collector child. Holds no sampling logic itself.
2. **Collector child** (`apps/collector`) — a plain Node process doing all probing, sampling loops, SQLite persistence and trace-point detection. Talks to main over **stdin/stdout NDJSON**, not Electron IPC. Every command is allowlisted and zod-validated (`packages/shared/src/contracts/collector-ipc.contract.ts`); every request/response is correlated by uuid.
3. **Renderer** (`apps/dashboard`, React 19 + Vite + uPlot) — reaches main only through `window.telemetryDesk`, exposed by a sandboxed preload.

Data flows renderer → `ipcRenderer.invoke` → main IPC handler → supervisor → NDJSON request → collector → SQLite/probes, and back. Adding an endpoint means touching all of: `IPC_CHANNELS`, the preload API, `apps/desktop/src/main/ipc.ts`, the supervisor method, `COLLECTOR_COMMANDS` + its zod schemas, and the collector's handler.

### Preload constraint

`apps/desktop/src/preload/preload.ts` compiles separately (`tsconfig.preload.json`) to a classic CommonJS script and **cannot import ESM workspace packages**. Its copy of `IPC_CHANNELS` is intentionally duplicated from `@telemetry-desk/shared` — keep the two in sync by hand. It is also excluded from eslint.

### Probing and honesty about measurements

`ProbeQuality` (`packages/application/src/ports/telemetry-ports.ts`) carries *how* a number was obtained, and the type's invariants are load-bearing:

- `tcp_rtt` — TCP connect RTT used when ICMP timed out; `latencyMs` must be a non-null integer and must never be presented to the user as ICMP RTT.
- `reachable` — legacy, connectivity without RTT; `latencyMs` must stay `null`. New probes must not emit it on the happy path.
- Raw ICMP on Windows needs elevation, so `WindowsNetworkProbe` shells out to `ping.exe` and parses both English and Portuguese output; the raw backend reports `unsupported`.
- Internet probes alternate between two public targets so an ISP-side problem can be distinguished from a single dead host; TCP fallback uses DNS-appropriate ports (53, then 443) to separate "ICMP blocked" from "offline".

Keep this distinction visible in anything that surfaces latency — collapsing the qualities into one number is the bug this design exists to prevent.

### TracePoints

A TracePoint freezes an evidence window (pre + post minutes, constants in `domain/trace-points`) around a slowdown, either manual ("Travou agora" from the tray) or auto-detected by `detectGatewayTriggers` (drop / loss / latency / jitter, with baselines and cooldown in `domain/diagnostics`). Diagnosis is explainable and hedged: `classifyTracePointDiagnosis` emits a cause plus a confidence, never a bare verdict. Thresholds live as named exports in `domain` — change them there, not at call sites.

### Storage

SQLite at `%USERPROFILE%/.telemetry-desk/telemetry.sqlite` (override with `TELEMETRY_DESK_DB_PATH`; the desktop app passes Electron's `userData` path). Schema changes are append-only entries in `packages/infrastructure/src/database/migrations.ts` — add a new versioned migration, never edit a shipped one.

## Conventions

- TS strict plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`. NodeNext modules: **relative imports need the `.js` extension**.
- `@typescript-eslint/consistent-type-imports` is an error; `--max-warnings=0`.
- Tests sit next to their subject as `*.test.ts(x)`. No mocking framework in use — services take dependencies (clock, ports, `createId`, timer functions) as constructor/option parameters, so tests pass fakes.
- Each package re-exports its public surface from `src/index.ts`; import across packages via the package name, never a deep relative path.
- CI runs on `windows-latest` and mirrors `npm run verify`.
