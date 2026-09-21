# TelemetryDesk

TelemetryDesk é um aplicativo desktop local e privacy-first: acompanha rede e recursos do computador para ajudar a distinguir lentidão da máquina, do Wi-Fi, do provedor ou da rota externa. Os dados ficam no dispositivo — sem conta, cloud ou telemetria externa.

## Requisitos

- Windows 10/11 (alvo inicial)
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
apps/dashboard          UI React/Vite (renderer)
apps/desktop            Electron main + preload + tray + supervisor do collector
apps/collector          processo Node separado que faz as sondagens
packages/domain         regras puras (thresholds, detectores, classificador de causa)
packages/application    services + ports (interfaces)
packages/platform       implementações por SO (probe, gateway resolver, capabilities)
packages/infrastructure SQLite/Drizzle, clock, protocolo NDJSON
packages/shared         contratos Zod (IPC Electron + comandos do collector)
```

Arquitetura em camadas: `domain` não depende de nada, `application` define ports, `platform`/`infrastructure` implementam, `apps` compõem.

## Como funciona

**Coleta** — o `collector` roda como processo filho supervisionado pelo Electron main, comunicando por NDJSON sobre stdin/stdout. Sonda o gateway a cada 1s e alterna entre dois hosts públicos para cobertura efetiva de ~1s da internet. Quando o ICMP dá timeout, há fallback de TCP connect (portas típicas 53 e 443); esse RTT é marcado como `tcp_rtt` e nunca apresentado como latência ICMP.

**Persistência** — amostras entram num `RingBuffer` em memória e são drenadas por uma fila para SQLite a cada 2s. Banco em `~/.telemetry-desk/telemetry.sqlite` (sobrescrevível por `TELEMETRY_DESK_DB_PATH`). Tabelas: `network_samples`, `trace_points`, `trace_point_evidence`, `protected_metric_ranges`.

**Detecção** — quatro gatilhos sobre a janela recente do gateway: `drop` (3 falhas consecutivas), `loss` (>20% em 10s), `latency` (2× baseline + 40ms, ou 100ms absoluto quando não há baseline suficiente) e `jitter` (>30ms). Baseline é a mediana de 15min com mínimo de 60 amostras.

**TracePoints** — um gatilho (ou ação manual do usuário) abre um TracePoint com janela pré e pós evento; as métricas dessa janela ficam protegidas contra retenção. Ao fechar a janela pós, o TracePoint é finalizado e classificado.

**Diagnóstico** — `classifyTracePointDiagnosis` cruza a saúde de gateway, dois alvos públicos, jogo, sistema e DNS para apontar a causa provável: `local_network`, `isp_or_external_route`, `game_route_or_server`, `local_system_bottleneck`, `dns_resolution` ou `inconclusive`. A confiança fica sempre abaixo de 1 — a UI nunca apresenta certeza absoluta.

## Estado atual

Funcionais: Início (status ao vivo, caminho da conexão, gráficos de latência), TracePoints (criação manual, listagem, diagnóstico) e Técnico.

Placeholders: Configurações e Exportar são maquetes visuais com controles desabilitados.

Repositório: https://github.com/mariyzx/telemetry-desk
