# TelemetryDesk MVP — Design técnico

Data: 2026-08-29
Status: aprovado em conversa
Plataforma inicial: Windows 10/11
Plataformas futuras: Linux e macOS

## 1. Objetivo

TelemetryDesk é um aplicativo desktop local, contínuo e privacy-first que monitora rede e recursos do computador para responder, com evidências explicáveis, se uma degradação provavelmente ocorreu no computador, rede local, gateway, provedor, rota externa ou servidor de jogo.

O MVP roda no system tray. Fechar ou ocultar a janela mantém a coleta; a ação explícita **Sair** encerra Electron e coletor. Não há conta, cloud, telemetria externa, captura de payload, conteúdo de tráfego, histórico de navegação nem observação das consultas DNS do usuário.

## 2. Escopo

### Incluído

- Tray e dashboard sob demanda.
- Coleta isolada e contínua.
- Gateway, dois alvos públicos configuráveis e alvo de jogo opcional.
- Latência, jitter, perda, DNS sintético, interface ativa e Wi-Fi básico.
- CPU, RAM, disco, rede e GPU quando suportada.
- TracePoints automáticos e manuais.
- Ring buffer, SQLite, retenção e agregação.
- Diagnóstico inicial por regras explicáveis.
- Configurações, exportação anonimizada e autostart opcional.
- Instalador Windows via electron-builder.

### Adiado

Overlay, cloud, contas, sincronização, suporte remoto, ML, descoberta sofisticada de jogos, speedtest contínuo, serviço Windows e implementações Linux/macOS.

## 3. Padrões AI-Forge

Stacks explícitas: `backend-node` e `frontend-react`. Aplicam-se, nesta ordem:

1. `core/workflow.md`;
2. `core/guardrails.md`;
3. regras L0 relevantes;
4. padrões L2 Node e React;
5. regras L3 futuras do projeto.

A organização segue módulos por domínio, handlers finos, services, repositories/providers, schemas Zod, serializers quando necessários, erros tipados, factory DI e composition root. Somente o módulo proprietário acessa diretamente suas entidades.

## 4. Arquitetura

A solução é um monólito modular com limites hexagonais.

```text
apps/
  desktop/                 Electron: main, tray, lifecycle, preload, IPC, supervisor
  dashboard/               React/Vite: início, TracePoints, técnico, config, exportação

packages/
  domain/                  Regras puras, agnósticas de SO e infraestrutura
    metrics/
    trace-points/
    diagnostics/
    settings/
  application/             Casos de uso e portas
    collection/
    history/
    trace-points/
    settings/
    export/
  platform/                Adapters de SO
    common/
    windows/
    linux/
    macos/
  infrastructure/
    database/
    logging/
    process-transport/
    export/
  shared/
    contracts/
    schemas/
    errors/
```

Dependências apontam para dentro:

```text
Platform adapter → Application port → Application → Domain
                                            ↓
                                  Infrastructure adapter
```

Regras:

- `domain` não depende de Electron, Node específico, SQLite, PowerShell ou SO.
- `application` depende apenas do domínio e de portas.
- `platform/*` e `infrastructure/*` implementam portas.
- `desktop` é o composition root e escolhe adapters por `process.platform`.
- Nenhum outro módulo contém condicionais de plataforma.
- Dashboard depende apenas dos contratos IPC.
- Unidades canônicas: ms, bytes, bps, razões `0..1`, dBm e epoch ms UTC.
- Durações e agendamento usam relógio monotônico.

Portas principais: `NetworkProbePort`, `GatewayResolverPort`, `DnsProbePort`, `SystemMetricsPort`, `WifiMetricsPort`, `GpuMetricsPort`, `NetworkInterfacePort`, `PowerStatePort`, `AutoStartPort`, `NotificationPort`, `MetricRepository` e `Clock`.

Cada plataforma publica capabilities (`icmp`, `wifiSignal`, `wifiChannel`, `wifiRoaming`, `gpuMetrics`, `networkInterfaceStats`). Capacidade ausente produz estado `unsupported`; não é tratada como falha. Linux/macOS terão contratos e capability stubs no MVP, sem implementações fictícias.

## 5. Processos e comunicação

Opção escolhida: child process supervisionado + IPC tipado; Fastify não integra o MVP.

```text
Dashboard
↕ contextBridge/preload
Electron main
↕ IPC Node tipado
Collector child process
↕
SQLite
```

O child process é o único proprietário do SQLite e hospeda scheduler, adapters, normalização, ring buffer, detector, application services, fila de persistência e agregação. Electron hospeda tray, janela, preload, handlers IPC finos e supervisor.

Características do protocolo:

- req/res correlacionadas por ID;
- contratos compartilhados validados com Zod nos dois lados;
- canais e comandos em allowlist explícita;
- eventos visuais enviados em lotes a cada 1 s;
- fila visual limitada pode substituir updates antigos;
- fila de persistência nunca descarta silenciosamente TracePoints;
- heartbeat a cada 5 s;
- ausência por 15 s reinicia o child com backoff limitado;
- falhas repetidas entram em estado degradado e são exibidas ao usuário.

## 6. Fluxo de dados

```text
Scheduler monotônico
→ adapters
→ normalização
→ amostra canônica
→ ring buffer de 10 min
→ detector
→ fila de persistência
→ transação SQLite em lote
→ agregação
→ lote IPC
→ dashboard
```

Falha individual de probe gera qualidade e erro tipado (`unsupported`, `permission_denied`, `timeout`, `unavailable`) sem interromper os demais collectors. Suspensão, hibernação, troca de interface e lacunas de scheduler viram contexto operacional, não perda presumida.

DB busy/falha transitória recebe retries limitados. Pressão persistente aumenta batches e reduz coleta não crítica; gateway e internet permanecem prioritários. Se a fila atingir o limite, incidentes e evidências são preservados antes de amostras normais.

## 7. Coleta

Frequências padrão configuráveis:

- gateway: 1 s;
- internet: dois alvos alternados, cada um a 2 s, cobertura efetiva de 1 s;
- jogo: 1 s quando configurado;
- CPU, RAM e rede: 3 s;
- disco e GPU: 5 s;
- Wi-Fi: 5 s;
- DNS sintético: 30 s;
- speedtest: manual.

ICMP usa biblioteca Node persistente/raw socket atrás de adapter e `ping.exe` como fallback Windows. PowerShell/CIM/APIs nativas ficam isolados no adapter Windows e não são iniciados a cada segundo.

O teste DNS consulta somente um domínio sintético configurado pelo TelemetryDesk. O app não intercepta nem registra consultas DNS do usuário.

## 8. Ring buffer e TracePoints

O ring buffer mantém pelo menos 10 min de amostras normalizadas. Um TracePoint preserva 5 min anteriores, toda a duração do evento e 5 min posteriores. TracePoints podem ser automáticos ou manuais por **travou agora**.

Estados:

```text
candidate → observing → confirmed → recovering → finalized
```

Recuperação exige 15 s estáveis. Cooldown/deduplicação padrão: 60 s. Eventos sobrepostos e correlatos formam um TracePoint com múltiplas evidências. O incidente referencia intervalos temporais protegidos; as métricas não são duplicadas inicialmente.

## 9. Detector inicial

Perfil padrão: balanceado.

Baseline por alvo e interface:

- janela móvel de 15 min;
- mínimo de 60 amostras válidas;
- mediana e MAD;
- sem baseline suficiente, thresholds absolutos conservadores.

Gatilhos iniciais:

- queda: 3 probes consecutivos sem resposta;
- perda: pelo menos 20% em 10 s, mínimo de 5 probes;
- latência: p95 por 15 s maior ou igual a `max(baseline × 2, baseline + 40 ms)`;
- jitter: pelo menos 30 ms por 15 s;
- DNS: pelo menos 1 s ou 3 falhas consecutivas;
- roaming: hash do AP mudou e houve degradação em ±15 s;
- sistema: CPU ≥95%, RAM ≥90% ou disco ≥95% por 30 s;
- manual: confirmação imediata, sem threshold.

Thresholds serão configuráveis após validação, mantendo defaults seguros.

## 10. Diagnóstico explicável

Prioridade inicial:

1. gateway ruim → `local_network`;
2. gateway bom e ambos os públicos ruins → `isp_or_external_route`;
3. públicos bons e jogo ruim → `game_route_or_server`;
4. rede boa e recursos ruins → `local_system_bottleneck`;
5. DNS ruim isolado → `dns_resolution`;
6. evidência insuficiente ou conflitante → `inconclusive`.

Cada resultado contém causa provável, confiança `0..1`, evidências, alternativas, próximos passos e código estável de explicação. A UI não apresenta causalidade como certeza.

## 11. SQLite

SQLite usa WAL, migrações Drizzle, um writer, transações em lote a cada 1–5 s ou por limite de itens e IDs ordenáveis (UUIDv7 ou ULID, decisão de implementação sem impacto contratual).

### Tabelas

`network_samples`: tempo, alvo, interface, latência, jitter, enviados, recebidos, perda, qualidade e erro.

`system_samples`: tempo, CPU, memória, disco, RX/TX e GPU opcional.

`wifi_samples`: tempo, interface, sinal, qualidade, canal, taxas RX/TX e hash do AP.

`targets`: papel (`gateway`, `internet`, `game`), host, nome e estado.

`network_interfaces`: hash estável local, tipo, nome exibível e first/last seen.

`trace_points`: origem, estado, timestamps, severidade, causa, confiança, código explicativo, gatilho e janelas.

`trace_point_evidence`: incidente, tipo, papel do alvo, observado, baseline, unidade e peso.

`protected_metric_ranges`: TracePoint, início e fim protegidos.

`settings`: chave, JSON validado por schema específico e timestamp.

`metric_aggregates`: bucket, granularidade, métrica, alvo/interface, min, média, max, p50, p95, contagens de amostra/falha e totais adequados à perda.

`aggregation_watermarks`: job e último bucket concluído.

`schema_migrations`: versão aplicada.

Índices cobrem tempo, alvo, interface, TracePoint e buckets. Repositories são os únicos consumidores diretos do client Drizzle.

## 12. Retenção e agregação

Defaults:

- bruto comum: 7 dias;
- agregados de 1 min: 90 dias;
- agregados de 15 min: 1 ano;
- TracePoints/evidências: 1 ano, configurável;
- métricas em faixas protegidas de TracePoints: 1 ano, alinhadas ao incidente;
- logs: 7 arquivos de 5 MB.

Agregação incremental usa watermarks:

- bruto → buckets de 1 min;
- 1 min → buckets de 15 min;
- latência/jitter: min, média, max, p50 e p95;
- perda: soma de enviados/recebidos, nunca média de percentuais;
- recursos: min, média, max e p95;
- lacunas são preservadas, sem interpolação persistida.

Limpeza roda diariamente e no boot quando atrasada, em lotes pequenos. `VACUUM` não é diário: somente manual ou quando a recuperação estimada justificar o custo.

## 13. Orçamento de recursos

Critérios em idle, dashboard fechado, após 10 min de aquecimento, na máquina de validação:

- CPU média total ≤1% de um core;
- CPU p95 ≤3% de um core;
- RAM Electron + coletor ≤150 MB;
- coletor ≤60 MB;
- escrita em disco ≤1 MB/min;
- DB após 7 dias brutos: meta ≤1 GB;
- probes ≤1 MB/h;
- nenhum PowerShell por segundo;
- dashboard oculto sem renderização/gráficos ativos.

Em bateria/economia: sistema passa a 5 s e rede pode passar a 2 s. Excesso sustentado por 5 min reduz collectors não críticos, sem sacrificar gateway/internet.

Teste soak de 24 h exige: nenhum gap inexplicado maior que 3 intervalos, ausência de crescimento contínuo de RAM, p95 de escrita DB <50 ms e fila normalmente abaixo de 2 batches.

## 14. Dashboard e tray

Dashboard:

- Início: estado simples, diagnóstico, evidências e ação sugerida.
- TracePoints: histórico, severidade e timeline.
- Técnico: séries uPlot de gateway, internet, jogo e sistema.
- Configurações: frequências, alvos, retenção e autostart.
- Exportação: período/TracePoints e prévia anonimizada.

Tray:

- status;
- **travou agora**;
- pausar/retomar;
- abrir dashboard;
- configurações;
- sair.

Autostart é opcional e ativado explicitamente pelo usuário.

## 15. Segurança e privacidade

- `contextIsolation: true`;
- `nodeIntegration: false`;
- renderer sandbox habilitado;
- CSP restritiva;
- preload mínimo via `contextBridge`;
- IPC explícito, allowlisted e validado com Zod;
- navegação externa e popups bloqueados;
- renderer sem Node, DB, filesystem ou shell;
- API HTTP ausente;
- tudo local e funcional offline;
- logs rotativos sem host, IP, SSID, MAC, payload ou consulta DNS do usuário;
- interface/AP usam hash local com salt aleatório;
- exportação manual remove hosts customizados e identificadores por padrão;
- nenhuma conta, cloud ou telemetria externa.

## 16. Exportação

Exportação gera snapshot sob demanda, sem conceder filesystem ao renderer. O renderer solicita opções validadas; Electron abre diálogo nativo; o application service materializa arquivo anonimizado no destino autorizado.

Por padrão, exporta métricas, agregados, TracePoints, códigos explicativos, versão do app e capabilities. Remove hosts customizados, nomes de interface, IPs, SSID, MAC, hash persistente do AP e caminhos locais. A prévia informa exatamente os campos incluídos.

## 17. Erros e observabilidade local

Erros de domínio são tipados e serializados como `{ id, code, message }`; detalhes 5xx ficam apenas nos logs locais. Cada comando IPC possui correlation ID. Logs estruturados usam Pino, rotação local e redaction. Não haverá Sentry ou tracker externo, pois conflitaria com o requisito de zero telemetria.

## 18. Testes

- domínio/detector: unitários determinísticos com relógio fake;
- adapters: contract tests compartilhados por porta;
- database: integração com SQLite temporário;
- IPC: schemas, allowlist, origem e respostas;
- Electron: smoke/e2e de lifecycle, tray e ocultação;
- dashboard: loading, empty, error e success;
- resiliência: child crash, DB busy, suspensão, troca de interface e alvo indisponível;
- performance: soak de 24 h e verificação dos orçamentos.

Toda correção de bug adiciona teste de regressão. Vitest é o runner principal.

## 19. Entrega e compatibilidade

Electron-builder produz instalador Windows x64. Node 24 é permitido durante desenvolvimento, porém runtime, módulos nativos e Electron serão validados cedo. Havendo incompatibilidade, desenvolvimento e CI migram para Node 22 LTS sem alterar contratos arquiteturais.

Fechar a janela oculta o dashboard. **Sair** encerra child e Electron com flush limitado da fila e fechamento seguro do SQLite. Serviço Windows permanece fora do MVP.

## 20. Critérios de sucesso do MVP

- Coleta permanece ativa com dashboard oculto.
- TracePoint manual aparece imediatamente e preserva a janela definida.
- Incidentes automáticos classificam os cenários básicos com evidências.
- Falha de um collector não derruba os demais.
- Reinício do child recupera coleta sem corromper DB.
- Retenção/agregação respeitam faixas protegidas.
- Exportação padrão não revela identificadores de rede.
- Renderer não acessa Node, DB ou filesystem.
- App cumpre os orçamentos no soak de 24 h.
- Arquitetura aceita novos adapters Linux/macOS sem alterar domínio ou dashboard.
