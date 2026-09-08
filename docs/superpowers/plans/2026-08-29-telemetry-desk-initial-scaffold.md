# TelemetryDesk Initial Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a fundação testável do TelemetryDesk: Git remoto configurado, monorepo npm ESM/TypeScript, limites hexagonais, Electron seguro, dashboard React mínimo e pipeline completo de qualidade/build.

**Architecture:** Monorepo npm workspaces com `apps/desktop` como composition root Electron, `apps/dashboard` como renderer React/Vite e packages internos em camadas `domain ← application ← platform/infrastructure`, mais `shared` para contratos. O scaffold entrega somente health/capabilities tipados ponta a ponta; coleta, SQLite e features do MVP ficam fora deste plano.

**Tech Stack:** Node.js 22 LTS, npm workspaces, TypeScript strict/ESM, Electron, React, Vite, Zod, Vitest, Testing Library, ESLint flat config, Prettier, electron-builder, GitHub Actions.

## Global Constraints

- Plataforma inicial: Windows 10/11; Linux/macOS somente contratos e capability stubs.
- Node.js `22.x` em desenvolvimento e CI; npm incluído no Node 22.
- ESM em todos os workspaces (`"type": "module"`) e TypeScript com `strict: true`.
- Stacks AI-Forge: `backend-node`, `frontend-react`; módulos por domínio, handlers finos, services, providers, schemas Zod, erros tipados, factory DI e composition root.
- Dependências apontam para dentro: platform/infrastructure → application → domain; dashboard → contratos IPC apenas.
- Unidades canônicas futuras: ms, bytes, bps, razões `0..1`, dBm, epoch ms UTC.
- Electron: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, CSP restritiva, preload mínimo, navegação/popups bloqueados.
- Sem Fastify/API HTTP, SQLite, telemetria externa, conta, cloud, coleta real, instalador publicado ou implementação fictícia de SO neste scaffold.
- Não executar `git init`, configurar remote, commit ou push durante autoria do plano; esses passos pertencem à execução.

---

## File Map

- Raiz: `.nvmrc`, `.gitignore`, `.prettierignore`, `.prettierrc.json`, `eslint.config.js`, `package.json`, `package-lock.json`, `tsconfig.base.json`, `vitest.workspace.ts`, `README.md`.
- CI: `.github/workflows/ci.yml`.
- Desktop: `apps/desktop/{package.json,tsconfig.json,electron-builder.yml}`, `src/main/{main.ts,window.ts,ipc.ts}`, `src/preload/preload.ts`, `src/shared/desktop-api.ts`, testes em `src/**/*.test.ts`.
- Dashboard: `apps/dashboard/{package.json,tsconfig.json,vite.config.ts,index.html}`, `src/{main.tsx,app.tsx,env.d.ts,styles.css}`, `src/test/setup.ts`, `src/app.test.tsx`.
- Packages: cada um possui `package.json`, `tsconfig.json`, `src/index.ts`; arquivos focados listados nas tarefas.

### Task 1: Repositório e manifesto do monorepo

**Files:**
- Create: `.nvmrc`, `.gitignore`, `.prettierignore`, `package.json`, `tsconfig.base.json`
- Generated: `package-lock.json`

**Interfaces:**
- Consumes: Git CLI autenticado; remote `https://github.com/mariyzx/telemetry-desk` existente ou criável pelo proprietário.
- Produces: branch `main`, remote `origin`, workspaces `apps/*` e `packages/*`; scripts `build`, `lint`, `format:check`, `typecheck`, `test`, `verify`.

- [ ] **Step 1: Inicializar Git e configurar remote sem sobrescrever histórico remoto**

Run:
```powershell
git init -b main
git remote add origin https://github.com/mariyzx/telemetry-desk
git remote -v
```
Expected:
```text
origin  https://github.com/mariyzx/telemetry-desk (fetch)
origin  https://github.com/mariyzx/telemetry-desk (push)
```
Se `origin` já existir, verificar com `git remote get-url origin`; somente usar `git remote set-url origin https://github.com/mariyzx/telemetry-desk` se a URL diferir. Não fazer push nesta tarefa.

- [ ] **Step 2: Criar arquivos raiz exatos**

`.nvmrc`:
```text
22
```

`.gitignore`:
```gitignore
node_modules/
dist/
coverage/
release/
*.log
.env
.env.*
!.env.example
.vscode/
.idea/
.DS_Store
Thumbs.db
*.tsbuildinfo
```

`.prettierignore`:
```text
node_modules
dist
coverage
release
package-lock.json
```

`package.json`:
```json
{
  "name": "telemetry-desk",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22 <23" },
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "lint": "eslint . --max-warnings=0",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "test": "vitest run --workspace vitest.workspace.ts",
    "verify": "npm run format:check && npm run lint && npm run typecheck && npm test && npm run build"
  }
}
```

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "useUnknownInCatchVariables": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 3: Instalar ferramentas raiz e travar resolução**

Run:
```powershell
npm install --save-dev typescript vitest eslint @eslint/js typescript-eslint prettier eslint-config-prettier @types/node
```
Expected: exit code `0`; `package-lock.json` criado; zero vulnerabilidades críticas reportadas. Não fixar versões manualmente: registrar as versões resolvidas pelo lockfile.

- [ ] **Step 4: Validar estrutura Git/npm**

Run:
```powershell
node --version
npm --version
npm pkg get workspaces
git status --short
```
Expected: Node começa com `v22.`; workspaces exibem `apps/*` e `packages/*`; somente arquivos novos/alterados planejados.

- [ ] **Step 5: Commit opcional da execução**

```powershell
git add .nvmrc .gitignore .prettierignore package.json package-lock.json tsconfig.base.json
git commit -m "chore: initialize telemetry desk workspace"
```
Expected: commit criado localmente; nenhum push.

### Task 2: Tooling compartilhado de lint, formato e testes

**Files:**
- Create: `.prettierrc.json`, `eslint.config.js`, `vitest.workspace.ts`
- Test: `packages/shared/src/tooling-smoke.test.ts`

**Interfaces:**
- Consumes: scripts raiz da Task 1.
- Produces: lint para TS/TSX, formatter estável, descoberta de testes em apps/packages.

- [ ] **Step 1: Criar teste vermelho de descoberta**

`packages/shared/src/tooling-smoke.test.ts`:
```ts
import { describe, expect, it } from 'vitest';

describe('tooling', () => {
  it('runs TypeScript tests', () => expect(true).toBe(true));
});
```
Run: `npm test`
Expected: FAIL porque `vitest.workspace.ts` ainda não existe.

- [ ] **Step 2: Configurar ferramentas**

`.prettierrc.json`:
```json
{ "singleQuote": true, "semi": true, "trailingComma": "all", "printWidth": 100 }
```

`eslint.config.js`:
```js
import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/coverage/**', '**/release/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  prettier,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: { '@typescript-eslint/consistent-type-imports': 'error' },
  },
);
```

`vitest.workspace.ts`:
```ts
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/*/vitest.config.ts',
  'apps/*/vitest.config.ts',
]);
```

- [ ] **Step 3: Criar package shared mínimo para o teste**

`packages/shared/package.json`:
```json
{
  "name": "@telemetry-desk/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./dist/index.js" },
  "scripts": { "build": "tsc -p tsconfig.json", "typecheck": "tsc -p tsconfig.json --noEmit" }
}
```
`packages/shared/tsconfig.json`:
```json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "rootDir": "src", "outDir": "dist", "composite": true }, "include": ["src"] }
```
`packages/shared/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', include: ['src/**/*.test.ts'] } });
```
`packages/shared/src/index.ts`:
```ts
export const workspaceName = 'TelemetryDesk' as const;
```

- [ ] **Step 4: Validar tooling**

Run: `npm test; npm run lint; npm run format:check`
Expected: teste PASS; lint exit `0`; Prettier informa `All matched files use Prettier code style!` após `npm run format` se necessário.

- [ ] **Step 5: Commit opcional**

```powershell
git add .prettierrc.json eslint.config.js vitest.workspace.ts packages/shared
git commit -m "chore: configure workspace quality tooling"
```

### Task 3: Domínio e application ports

**Files:**
- Create: `packages/domain/{package.json,tsconfig.json,vitest.config.ts}`, `packages/domain/src/{index.ts,capabilities/platform-capabilities.ts}`
- Create: `packages/application/{package.json,tsconfig.json,vitest.config.ts}`, `packages/application/src/{index.ts,ports/telemetry-ports.ts,services/get-runtime-status.service.ts}`
- Test: `packages/application/src/services/get-runtime-status.service.test.ts`

**Interfaces:**
- Consumes: nenhum adapter concreto.
- Produces: `PlatformCapabilities`; portas `NetworkProbePort`, `GatewayResolverPort`, `DnsProbePort`, `SystemMetricsPort`, `WifiMetricsPort`, `GpuMetricsPort`, `NetworkInterfacePort`, `PowerStatePort`, `AutoStartPort`, `NotificationPort`, `MetricRepository`, `Clock`; `GetRuntimeStatusService.execute(): Promise<RuntimeStatus>`.

- [ ] **Step 1: Escrever teste vermelho do service**

```ts
import { describe, expect, it } from 'vitest';
import { GetRuntimeStatusService } from './get-runtime-status.service.js';

it('returns capabilities with monotonic observation time', async () => {
  const service = new GetRuntimeStatusService({ nowEpochMs: () => 1_700_000_000_000, monotonicMs: () => 42 }, async () => ({ icmp: true, wifiSignal: false, wifiChannel: false, wifiRoaming: false, gpuMetrics: false, networkInterfaceStats: true }));
  await expect(service.execute()).resolves.toEqual({ status: 'ready', observedAtEpochMs: 1_700_000_000_000, monotonicMs: 42, capabilities: { icmp: true, wifiSignal: false, wifiChannel: false, wifiRoaming: false, gpuMetrics: false, networkInterfaceStats: true } });
});
```
Run: `npm test -- --run packages/application/src/services/get-runtime-status.service.test.ts`
Expected: FAIL com módulo ausente.

- [ ] **Step 2: Definir tipos e portas**

`platform-capabilities.ts`:
```ts
export interface PlatformCapabilities { icmp: boolean; wifiSignal: boolean; wifiChannel: boolean; wifiRoaming: boolean; gpuMetrics: boolean; networkInterfaceStats: boolean }
```
`telemetry-ports.ts`:
```ts
export type ProbeQuality = 'ok' | 'unsupported' | 'permission_denied' | 'timeout' | 'unavailable';
export interface Clock { nowEpochMs(): number; monotonicMs(): number }
export interface NetworkProbePort { probe(host: string): Promise<{ latencyMs: number | null; quality: ProbeQuality }> }
export interface GatewayResolverPort { resolve(): Promise<string | null> }
export interface DnsProbePort { probe(host: string): Promise<{ latencyMs: number | null; quality: ProbeQuality }> }
export interface SystemMetricsPort { read(): Promise<{ cpuRatio: number; memoryRatio: number }> }
export interface WifiMetricsPort { read(): Promise<{ signalDbm: number | null; quality: ProbeQuality }> }
export interface GpuMetricsPort { read(): Promise<{ usageRatio: number | null; quality: ProbeQuality }> }
export interface NetworkInterfacePort { active(): Promise<{ id: string; name: string } | null> }
export interface PowerStatePort { isEnergySaving(): Promise<boolean> }
export interface AutoStartPort { isEnabled(): Promise<boolean>; setEnabled(enabled: boolean): Promise<void> }
export interface NotificationPort { show(title: string, body: string): Promise<void> }
export interface MetricRepository { append(sample: unknown): Promise<void> }
```

- [ ] **Step 3: Implementar service mínimo**

```ts
import type { PlatformCapabilities } from '@telemetry-desk/domain';
import type { Clock } from '../ports/telemetry-ports.js';
export interface RuntimeStatus { status: 'ready'; observedAtEpochMs: number; monotonicMs: number; capabilities: PlatformCapabilities }
export class GetRuntimeStatusService {
  constructor(private readonly clock: Clock, private readonly capabilities: () => Promise<PlatformCapabilities>) {}
  async execute(): Promise<RuntimeStatus> { return { status: 'ready', observedAtEpochMs: this.clock.nowEpochMs(), monotonicMs: this.clock.monotonicMs(), capabilities: await this.capabilities() }; }
}
```
Reexportar todos os tipos nos respectivos `src/index.ts`. Criar manifests como na Task 2; application depende de `"@telemetry-desk/domain": "*"`.

- [ ] **Step 4: Validar limites puros**

Run: `npm install; npm test -- --run packages/application/src/services/get-runtime-status.service.test.ts; npm run typecheck -w @telemetry-desk/domain; npm run typecheck -w @telemetry-desk/application`
Expected: PASS e ambos typechecks exit `0`.

- [ ] **Step 5: Commit opcional**

```powershell
git add packages/domain packages/application package-lock.json
git commit -m "feat: define core telemetry ports"
```

### Task 4: Shared IPC contracts e erros

**Files:**
- Modify: `packages/shared/package.json`, `packages/shared/src/index.ts`
- Create: `packages/shared/src/contracts/runtime-status.contract.ts`, `packages/shared/src/errors/app-error.ts`
- Test: `packages/shared/src/contracts/runtime-status.contract.test.ts`

**Interfaces:**
- Consumes: `PlatformCapabilities` shape da Task 3, duplicada somente no schema de fronteira para evitar dashboard → domain.
- Produces: `runtimeStatusRequestSchema`, `runtimeStatusResponseSchema`, `RuntimeStatusResponse`, `IPC_CHANNELS.runtimeStatus = 'runtime:get-status'`, `SerializedAppError = { id; code; message }`.

- [ ] **Step 1: Escrever testes vermelhos dos schemas**

```ts
import { describe, expect, it } from 'vitest';
import { runtimeStatusRequestSchema, runtimeStatusResponseSchema } from './runtime-status.contract.js';
it('rejects unknown request fields', () => expect(runtimeStatusRequestSchema.safeParse({ extra: true }).success).toBe(false));
it('accepts canonical runtime status', () => expect(runtimeStatusResponseSchema.safeParse({ correlationId: '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520', data: { status: 'ready', observedAtEpochMs: 1700000000000, monotonicMs: 42, capabilities: { icmp: true, wifiSignal: false, wifiChannel: false, wifiRoaming: false, gpuMetrics: false, networkInterfaceStats: true } } }).success).toBe(true));
```
Run: `npm test -- --run packages/shared/src/contracts/runtime-status.contract.test.ts`
Expected: FAIL por exports ausentes.

- [ ] **Step 2: Instalar Zod e implementar contratos**

Run: `npm install zod -w @telemetry-desk/shared`

```ts
import { z } from 'zod';
export const IPC_CHANNELS = { runtimeStatus: 'runtime:get-status' } as const;
export const runtimeStatusRequestSchema = z.object({ correlationId: z.string().uuid() }).strict();
export const platformCapabilitiesSchema = z.object({ icmp: z.boolean(), wifiSignal: z.boolean(), wifiChannel: z.boolean(), wifiRoaming: z.boolean(), gpuMetrics: z.boolean(), networkInterfaceStats: z.boolean() }).strict();
export const runtimeStatusResponseSchema = z.object({ correlationId: z.string().uuid(), data: z.object({ status: z.literal('ready'), observedAtEpochMs: z.number().int().nonnegative(), monotonicMs: z.number().nonnegative(), capabilities: platformCapabilitiesSchema }).strict() }).strict();
export type RuntimeStatusResponse = z.infer<typeof runtimeStatusResponseSchema>;
```

`app-error.ts`:
```ts
export interface SerializedAppError { id: string; code: string; message: string }
export class AppError extends Error { constructor(readonly id: string, readonly code: string, message: string) { super(message); this.name = 'AppError'; } serialize(): SerializedAppError { return { id: this.id, code: this.code, message: this.message }; } }
```
Reexportar em `src/index.ts`.

- [ ] **Step 3: Rodar testes e typecheck**

Run: `npm test -- --run packages/shared/src/contracts/runtime-status.contract.test.ts; npm run typecheck -w @telemetry-desk/shared`
Expected: 2 testes PASS; typecheck exit `0`.

- [ ] **Step 4: Commit opcional**

```powershell
git add packages/shared package-lock.json
git commit --trailer "Co-authored-by: Cursor <cursoragent@cursor.com>" -m "feat: add validated ipc contracts"
```

### Task 5: Platform capability adapters e infrastructure clock

**Files:**
- Create: `packages/platform/{package.json,tsconfig.json,vitest.config.ts}`, `packages/platform/src/{index.ts,common/capabilities.ts,windows/windows-capabilities.ts,linux/linux-capabilities.ts,macos/macos-capabilities.ts}`
- Test: `packages/platform/src/common/capabilities.test.ts`
- Create: `packages/infrastructure/{package.json,tsconfig.json,vitest.config.ts}`, `packages/infrastructure/src/{index.ts,clock/system-clock.ts}`
- Test: `packages/infrastructure/src/clock/system-clock.test.ts`

**Interfaces:**
- Consumes: `PlatformCapabilities`, `Clock`.
- Produces: `getPlatformCapabilities(platform: NodeJS.Platform): PlatformCapabilities`; `SystemClock`.

- [ ] **Step 1: Escrever testes vermelhos de capabilities**

```ts
import { expect, it } from 'vitest';
import { getPlatformCapabilities } from './capabilities.js';
it('publishes conservative Windows scaffold capabilities', () => expect(getPlatformCapabilities('win32')).toEqual({ icmp: false, wifiSignal: false, wifiChannel: false, wifiRoaming: false, gpuMetrics: false, networkInterfaceStats: false }));
it.each(['linux', 'darwin'] as const)('keeps %s unsupported', (platform) => expect(Object.values(getPlatformCapabilities(platform)).every((value) => !value)).toBe(true));
```
Expected: FAIL por módulo ausente.

- [ ] **Step 2: Implementar adapters sem capacidades fictícias**

Cada arquivo de SO exporta objeto frozen com seis flags `false`. `common/capabilities.ts` seleciona por `switch`; plataformas não previstas também retornam stub comum. Não adicionar condicionais de SO fora deste package e do composition root.

```ts
export function getPlatformCapabilities(platform: NodeJS.Platform): PlatformCapabilities {
  if (platform === 'win32') return windowsCapabilities;
  if (platform === 'linux') return linuxCapabilities;
  if (platform === 'darwin') return macosCapabilities;
  return unsupportedCapabilities;
}
```

- [ ] **Step 3: Escrever e implementar teste do relógio**

```ts
import { expect, it, vi } from 'vitest';
import { SystemClock } from './system-clock.js';
it('exposes epoch and monotonic clocks', () => { vi.spyOn(Date, 'now').mockReturnValue(1700000000000); expect(new SystemClock().nowEpochMs()).toBe(1700000000000); expect(new SystemClock().monotonicMs()).toBeGreaterThanOrEqual(0); });
```

```ts
import { performance } from 'node:perf_hooks';
import type { Clock } from '@telemetry-desk/application';
export class SystemClock implements Clock { nowEpochMs(): number { return Date.now(); } monotonicMs(): number { return performance.now(); } }
```
Manifests seguem Task 2; platform depende de domain; infrastructure depende de application.

- [ ] **Step 4: Validar packages**

Run: `npm install; npm test -- --run packages/platform packages/infrastructure; npm run typecheck -w @telemetry-desk/platform; npm run typecheck -w @telemetry-desk/infrastructure`
Expected: 3 testes PASS; typechecks exit `0`.

- [ ] **Step 5: Commit opcional**

```powershell
git add packages/platform packages/infrastructure package-lock.json
git commit --trailer "Co-authored-by: Cursor <cursoragent@cursor.com>" -m "feat: add platform capability adapters"
```

### Task 6: Dashboard React/Vite mínimo

**Files:**
- Create: `apps/dashboard/package.json`, `apps/dashboard/tsconfig.json`, `apps/dashboard/vite.config.ts`, `apps/dashboard/vitest.config.ts`, `apps/dashboard/index.html`
- Create: `apps/dashboard/src/{main.tsx,app.tsx,env.d.ts,styles.css}`, `apps/dashboard/src/test/setup.ts`
- Test: `apps/dashboard/src/app.test.tsx`

**Interfaces:**
- Consumes: `window.telemetryDesk.getRuntimeStatus(correlationId): Promise<RuntimeStatusResponse>` definido pela API desktop compartilhada; somente tipos de `@telemetry-desk/shared`.
- Produces: UI acessível com estados loading, success e error; bundle `apps/dashboard/dist`.

- [ ] **Step 1: Instalar deps do workspace**

Run:
```powershell
npm install react react-dom -w apps/dashboard
npm install --save-dev vite @vitejs/plugin-react @types/react @types/react-dom jsdom @testing-library/react @testing-library/jest-dom -w apps/dashboard
```
Expected: exit `0`; lockfile atualizado.

- [ ] **Step 2: Escrever testes vermelhos dos estados**

```tsx
import { render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { App } from './app';
afterEach(() => vi.restoreAllMocks());
it('shows ready status and capability count', async () => { window.telemetryDesk = { getRuntimeStatus: vi.fn().mockResolvedValue({ correlationId: crypto.randomUUID(), data: { status: 'ready', observedAtEpochMs: 1700000000000, monotonicMs: 42, capabilities: { icmp: false, wifiSignal: false, wifiChannel: false, wifiRoaming: false, gpuMetrics: false, networkInterfaceStats: false } } }) }; render(<App />); expect(screen.getByText('Carregando status…')).toBeInTheDocument(); expect(await screen.findByRole('heading', { name: 'TelemetryDesk pronto' })).toBeInTheDocument(); expect(screen.getByText('0 de 6 capacidades disponíveis')).toBeInTheDocument(); });
it('shows an error without leaking details', async () => { window.telemetryDesk = { getRuntimeStatus: vi.fn().mockRejectedValue(new Error('secret')) }; render(<App />); expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível obter o status local.'); expect(screen.queryByText('secret')).not.toBeInTheDocument(); });
```
Run: `npm test -- --run apps/dashboard/src/app.test.tsx`
Expected: FAIL porque App/API global não existem.

- [ ] **Step 3: Implementar app mínimo e declaração global**

`env.d.ts` declara `Window.telemetryDesk` com `getRuntimeStatus`. `app.tsx` usa `useEffect`, `crypto.randomUUID()`, estado discriminado `loading | success | error`, conta flags verdadeiras e renderiza exatamente as cópias testadas. `main.tsx` monta `<App />` em `#root`. `styles.css` usa layout simples, foco visível e `color-scheme: dark` sem gráficos/loops ocultos.

- [ ] **Step 4: Configurar Vite/Vitest/TS**

`vite.config.ts` usa `react()` e `base: './'`; `vitest.config.ts` usa `jsdom`, setup `src/test/setup.ts`; scripts: `dev`, `build: vite build`, `typecheck: tsc --noEmit`, `test: vitest run`. CSP em `index.html`:
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" />
```

- [ ] **Step 5: Verificar renderer**

Run: `npm test -- --run apps/dashboard/src/app.test.tsx; npm run typecheck -w apps/dashboard; npm run build -w apps/dashboard`
Expected: 2 testes PASS; typecheck exit `0`; Vite cria `apps/dashboard/dist/index.html` e assets.

- [ ] **Step 6: Commit opcional**

```powershell
git add apps/dashboard package-lock.json
git commit --trailer "Co-authored-by: Cursor <cursoragent@cursor.com>" -m "feat: add minimal status dashboard"
```

### Task 7: Electron seguro, preload e IPC fino

**Files:**
- Create: `apps/desktop/package.json`, `apps/desktop/tsconfig.json`, `apps/desktop/vitest.config.ts`, `apps/desktop/electron-builder.yml`
- Create: `apps/desktop/src/shared/desktop-api.ts`, `apps/desktop/src/main/{main.ts,window.ts,ipc.ts}`, `apps/desktop/src/preload/preload.ts`
- Test: `apps/desktop/src/main/window.test.ts`, `apps/desktop/src/main/ipc.test.ts`

**Interfaces:**
- Consumes: `GetRuntimeStatusService`, `SystemClock`, `getPlatformCapabilities`, shared Zod contracts.
- Produces: `DesktopApi.getRuntimeStatus(correlationId)`, BrowserWindow endurecida, allowlist de um canal, app Electron empacotável.

- [ ] **Step 1: Instalar deps Electron**

Run:
```powershell
npm install electron -w apps/desktop
npm install --save-dev electron-builder @types/node -w apps/desktop
```
Expected: exit `0`; lockfile atualizado. Confirmar no lockfile que a versão de Electron escolhida suporta Node 22 para scripts de build; runtime permanece o Node embarcado do Electron.

- [ ] **Step 2: Escrever teste vermelho das preferências da janela**

```ts
import { expect, it, vi } from 'vitest';
import { createMainWindow } from './window.js';
it('creates a sandboxed isolated renderer', () => { const BrowserWindow = vi.fn(function (this: object) { return Object.assign(this, { webContents: { setWindowOpenHandler: vi.fn(), on: vi.fn() }, loadFile: vi.fn(), loadURL: vi.fn(), on: vi.fn() }); }); createMainWindow({ BrowserWindow: BrowserWindow as never, preloadPath: 'preload.js', dashboardPath: 'index.html', devServerUrl: undefined }); expect(BrowserWindow).toHaveBeenCalledWith(expect.objectContaining({ webPreferences: expect.objectContaining({ contextIsolation: true, nodeIntegration: false, sandbox: true, preload: 'preload.js' }) })); });
```
Run: `npm test -- --run apps/desktop/src/main/window.test.ts`
Expected: FAIL por módulo ausente.

- [ ] **Step 3: Implementar janela segura**

`createMainWindow` recebe dependências para teste, cria janela `show: false`, bloqueia popups com `{ action: 'deny' }`, bloqueia `will-navigate` quando URL difere da URL inicial, carrega `VITE_DEV_SERVER_URL` somente em dev e `dashboardPath` em produção. Evento `close` chama `preventDefault()` e `hide()` salvo quando flag explícita `isQuitting()` for verdadeira.

- [ ] **Step 4: Escrever teste vermelho do IPC validado**

```ts
import { expect, it, vi } from 'vitest';
import { registerRuntimeIpc } from './ipc.js';
it('validates request and preserves correlation id', async () => { const handle = vi.fn(); registerRuntimeIpc({ handle } as never, { execute: vi.fn().mockResolvedValue({ status: 'ready', observedAtEpochMs: 1700000000000, monotonicMs: 42, capabilities: { icmp: false, wifiSignal: false, wifiChannel: false, wifiRoaming: false, gpuMetrics: false, networkInterfaceStats: false } }) }); const handler = handle.mock.calls[0][1]; await expect(handler({}, { correlationId: '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520' })).resolves.toMatchObject({ correlationId: '8bbf73d6-57ca-4fdd-9ce7-57bcd2404520', data: { status: 'ready' } }); await expect(handler({}, { bad: true })).rejects.toThrow(); });
```
Expected: FAIL antes da implementação.

- [ ] **Step 5: Implementar handler e preload mínimo**

`registerRuntimeIpc` registra somente `IPC_CHANNELS.runtimeStatus`, valida req/res com schemas Zod e não recebe `req`/`res` web. `preload.ts` expõe via `contextBridge.exposeInMainWorld('telemetryDesk', api)`; API chama apenas `ipcRenderer.invoke(IPC_CHANNELS.runtimeStatus, { correlationId })`. Nenhum filesystem, shell, DB ou API genérica de `send/on` é exposta.

- [ ] **Step 6: Criar composition root e lifecycle mínimo**

`main.ts` instancia `SystemClock`, `GetRuntimeStatusService(clock, async () => getPlatformCapabilities(process.platform))`, registra IPC antes da janela, encerra no `window-all-closed` somente fora de macOS e controla `isQuitting` em `before-quit`. Neste scaffold não iniciar collector child, tray ou SQLite.

- [ ] **Step 7: Configurar build desktop**

Scripts: `build` compila TS do desktop após dashboard; `dev` inicia Vite e Electron por comando compatível com PowerShell (usar `concurrently` e `wait-on` como devDependencies); `dist:win` executa `npm run build` e `electron-builder --win nsis --x64 --publish never`. `electron-builder.yml`:
```yaml
appId: com.telemetrydesk.app
productName: TelemetryDesk
directories:
  output: ../../release
files:
  - dist/**/*
  - ../dashboard/dist/**/*
win:
  target:
    - target: nsis
      arch: [x64]
artifactName: TelemetryDesk-${version}-${arch}.${ext}
nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
```
Não assinar/publicar nesta fundação.

- [ ] **Step 8: Verificar desktop**

Run: `npm test -- --run apps/desktop; npm run typecheck -w apps/desktop; npm run build -w apps/desktop`
Expected: testes de janela/IPC PASS; typecheck exit `0`; `apps/desktop/dist/main/main.js` e `preload/preload.js` criados.

- [ ] **Step 9: Smoke manual Windows**

Run: `npm run dev -w apps/desktop`
Expected: janela mostra `TelemetryDesk pronto`; DevTools console sem CSP/Node integration errors; `typeof window.require` é `undefined`; tentativa de popup é bloqueada; fechar oculta a janela, encerrar pelo processo termina o app. Parar com `Ctrl+C` após validação.

- [ ] **Step 10: Commit opcional**

```powershell
git add apps/desktop package-lock.json
git commit --trailer "Co-authored-by: Cursor <cursoragent@cursor.com>" -m "feat: add secure electron shell"
```

### Task 8: CI, README mínimo e verificação final

**Files:**
- Create: `.github/workflows/ci.yml`, `README.md`
- Modify: `package.json` se a ordem de build precisar ser explícita.

**Interfaces:**
- Consumes: todos os scripts/workspaces anteriores.
- Produces: gate Windows/Node 22 reproduzível; instruções mínimas locais.

- [ ] **Step 1: Criar workflow CI**

`.github/workflows/ci.yml`:
```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  verify:
    runs-on: windows-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run format:check
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
```
Não adicionar deploy, release, secrets ou push automático.

- [ ] **Step 2: Criar README estritamente necessário**

Incluir: propósito privacy-first em 2 frases; requisitos Windows 10/11, Node 22, npm; comandos `npm ci`, `npm run dev -w apps/desktop`, `npm run verify`, `npm run dist:win -w apps/desktop`; mapa de workspaces; aviso de que scaffold não coleta métricas, não cria DB e não envia telemetria; remote oficial `https://github.com/mariyzx/telemetry-desk`.

- [ ] **Step 3: Corrigir ordem de build sem depender da ordem incidental dos workspaces**

Se `npm run build --workspaces` não respeitar dependências para assets Electron, substituir script raiz por:
```json
"build": "npm run build -w @telemetry-desk/domain && npm run build -w @telemetry-desk/shared && npm run build -w @telemetry-desk/application && npm run build -w @telemetry-desk/platform && npm run build -w @telemetry-desk/infrastructure && npm run build -w apps/dashboard && npm run build -w apps/desktop"
```
Expected: build limpo funciona após remoção de todos os `dist`.

- [ ] **Step 4: Executar gate completo em checkout limpo**

Run:
```powershell
Remove-Item -Recurse -Force apps\*\dist, packages\*\dist, coverage -ErrorAction SilentlyContinue
npm ci
npm run verify
```
Expected: install exit `0`; Prettier sem divergências; ESLint zero warnings/errors; todos typechecks/testes PASS; todos bundles gerados.

- [ ] **Step 5: Verificar pacote Windows sem publicar**

Run: `npm run dist:win -w apps/desktop`
Expected: `release/TelemetryDesk-0.1.0-x64.exe` criado; nenhum upload; nenhum pedido de credenciais. Se Electron/native tooling falhar em Node 22, corrigir versões no lockfile e repetir; não migrar para Node 24 sem alterar esta restrição e CI de forma deliberada.

- [ ] **Step 6: Auditoria de segurança do artefato**

Run:
```powershell
Select-String -Path apps\desktop\dist\**\*.js -Pattern 'nodeIntegration:!0|contextIsolation:!1|sandbox:!1'
Select-String -Path apps\desktop\dist\preload\*.js -Pattern 'child_process|node:fs|node:shell|ipcRenderer\.send|ipcRenderer\.on'
```
Expected: nenhuma correspondência. Confirmar que apenas `runtime:get-status` aparece como canal IPC no preload.

- [ ] **Step 7: Verificar status e remote antes de qualquer push**

Run:
```powershell
git remote -v
git status --short
git log --oneline --decorate -5
```
Expected: `origin` aponta exatamente para `https://github.com/mariyzx/telemetry-desk`; mudanças somente do scaffold; commits locais coerentes. Não executar push sem autorização explícita.

- [ ] **Step 8: Commit opcional final**

```powershell
git add .github/workflows/ci.yml README.md package.json package-lock.json
git commit --trailer "Co-authored-by: Cursor <cursoragent@cursor.com>" -m "ci: verify scaffold on windows"
```
Expected: commit local; nenhum push.

## Final Acceptance Checklist

- [ ] Git usa `main`; `origin` correto; nenhum push automático.
- [ ] `npm ci` reproduz o lockfile em Windows com Node 22.
- [ ] Todos os workspaces são ESM e TypeScript strict.
- [ ] Domain não importa Node/Electron/Zod; application importa apenas domain/tipos próprios.
- [ ] Linux/macOS retornam capabilities unsupported, sem adapters fictícios.
- [ ] Dashboard importa somente shared contracts; não acessa Node, fs, shell, DB ou HTTP.
- [ ] BrowserWindow tem isolation/sandbox, preload allowlisted, CSP, popup/navegação bloqueados.
- [ ] IPC valida req/res Zod e preserva correlation ID.
- [ ] `npm run format:check`, `lint`, `typecheck`, `test`, `build` passam.
- [ ] electron-builder gera NSIS x64 local sem publicar.
- [ ] CI executa todos os gates em `windows-latest` + Node 22.
- [ ] Scaffold não implementa coleta, tray, child supervisor, SQLite, retenção, TracePoints, detector, exportação ou autostart.
