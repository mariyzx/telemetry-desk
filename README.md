# TelemetryDesk

TelemetryDesk é um aplicativo desktop local e privacy-first: acompanha rede e recursos do computador para ajudar a distinguir lentidão da máquina, do Wi-Fi, do provedor ou da rota externa. Os dados ficam no dispositivo — sem conta, cloud ou telemetria externa.

## Requisitos

- Windows 10/11 (alvo inicial do scaffold)
- Node.js 22 (ver `.nvmrc`)
- npm (incluído no Node 22)

## Comandos

```powershell
npm ci
npm run dev -w @telemetry-desk/desktop
npm run verify
npm run dist:win -w @telemetry-desk/desktop
```

`npm run verify` executa format, lint, typecheck, testes e build. `dist:win` gera o instalador NSIS x64 em `release/` sem publicar.

## Workspaces

```text
apps/dashboard   UI React/Vite (renderer)
apps/desktop     Electron main + preload
packages/domain
packages/application
packages/platform
packages/infrastructure
packages/shared
```

Este scaffold expõe apenas status/capabilities tipados ponta a ponta. Não coleta métricas, não cria banco e não envia telemetria.

Repositório: https://github.com/mariyzx/telemetry-desk
