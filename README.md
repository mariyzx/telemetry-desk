# TelemetryDesk

TelemetryDesk é um aplicativo desktop, local e multiplataforma em desenvolvimento. A proposta é acompanhar a rede e os recursos do computador para ajudar a responder uma pergunta comum: quando algo fica lento ou trava, o problema parece estar na máquina, no Wi-Fi, no provedor, na rota externa ou no servidor?

O projeto parte de uma regra simples: os dados ficam no computador do usuário. Não há conta, cloud nem telemetria externa, e o aplicativo não deve capturar conteúdo de tráfego, histórico de navegação ou consultas DNS do usuário.

## Privacidade e segurança

O desenho do projeto prevê funcionamento offline, processamento e armazenamento locais e ausência de captura de payloads. O renderer não terá acesso direto a Node.js, filesystem, shell ou banco de dados. A comunicação IPC deverá ser explícita, limitada e validada; logs e exportações deverão remover identificadores sensíveis por padrão.

Parte dessa base já existe na configuração inicial do Electron, mas coleta, persistência, IPC completo, logs e exportação ainda precisam ser implementados e validados.

## Stack e arquitetura

A base atual usa Node.js 22+, npm workspaces, TypeScript, Electron, React, Vite e Vitest. SQLite, Drizzle, Zod, Pino, uPlot e electron-builder fazem parte do desenho do MVP, mas ainda não estão instalados no scaffold.

O projeto segue um monólito modular com limites hexagonais. O domínio deve permanecer independente do sistema operacional e da infraestrutura; adapters de plataforma ficam em `platform`, persistência e transporte em `infrastructure`, e o Electron funciona como ponto de composição.

```text
Dashboard React
↕ preload/contextBridge
Electron main
↕ IPC tipado
Collector child process
↕
SQLite
```

Windows 10/11 é o alvo inicial. Linux e macOS são extensões futuras dos mesmos contratos.

## Estrutura

```text
apps/
  dashboard/       Interface React/Vite
  desktop/         Processo principal e preload Electron
packages/
  domain/          Regras de domínio
  application/     Casos de uso e portas
  platform/        Adapters específicos de SO
  infrastructure/  Persistência, logs e transporte
  shared/          Contratos e utilitários compartilhados
docs/
  superpowers/
    specs/          Especificações e decisões de design
```

Os pacotes ainda contêm apenas pontos de entrada mínimos. A organização interna por módulos será criada conforme a implementação avançar.

## Como executar

Requisitos:

- Windows 10 ou 11 para o desenvolvimento inicial;
- Node.js `>=22` — a versão indicada em `.nvmrc` é a linha 22;
- npm.

Na raiz do projeto, instale as dependências:

```powershell
npm install
```

Scripts disponíveis no `package.json` raiz:

```powershell
npm run dev
npm run build
npm run typecheck
npm test
```

`npm run dev` inicia apenas o dashboard Vite. `npm run build` e `npm run typecheck` executam os scripts existentes em todos os workspaces; `npm test` roda `vitest run`.

O fluxo integrado entre Electron e dashboard ainda não existe. Para abrir o shell desktop no estado atual, gere os artefatos primeiro e depois execute o workspace do Electron:

```powershell
npm run build
npm run dev -w @telemetry-desk/desktop
```

Docker e WSL não são necessários para instalar dependências, executar o dashboard, compilar ou rodar os testes atuais.

## Próximos passos

O trabalho previsto começa pelos contratos de domínio e IPC, seguido pelo collector supervisionado e pelos adapters para Windows. Depois vêm armazenamento local, retenção e agregação, TracePoints, diagnóstico explicável e evolução do dashboard, tray, configurações e exportação. Instalador, segurança, resiliência e consumo de recursos também precisarão ser validados antes do MVP.
