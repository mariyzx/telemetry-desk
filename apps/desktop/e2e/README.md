# E2E screenshots (Electron)

Captura PNGs das seções do dashboard **dentro do Electron** (não no browser Vite).

## Pré-requisitos

- Node 22
- Ambiente com GUI (janela Electron)
- Pacotes do monorepo instalados (`npm install` na raiz)

## Como rodar

Na raiz do monorepo:

```bash
npm run e2e:screenshots -w @telemetry-desk/desktop
```

O script:

1. Builda o dashboard (`vite build`) e o shell desktop (`tsc`)
2. Lança o Electron apontando para `dist/main/main.js` **sem** `VITE_DEV_SERVER_URL` (carrega `dashboard/dist/index.html` via `file://`)
3. Clica na sidebar (Início, TracePoints, Técnico, Configurações, Exportar)
4. Grava PNGs em `apps/desktop/e2e/screenshots/`

## Saída

| Arquivo        | Seção         |
| -------------- | ------------- |
| `inicio.png`   | Início        |
| `trace.png`    | TracePoints   |
| `tecnico.png`  | Técnico       |
| `config.png`   | Configurações |
| `exportar.png` | Exportar      |

A pasta `screenshots/` está no `.gitignore`.

## Sem GUI / headless remoto

Se o ambiente não puder abrir janela Electron, o comando falha. Rode localmente em uma sessão gráfica (Windows desktop / display local).
