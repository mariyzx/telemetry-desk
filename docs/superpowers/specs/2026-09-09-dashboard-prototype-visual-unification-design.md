# Unificação visual do protótipo do dashboard

Data: 2026-09-09
Status: aprovado em conversa
Artefato: `apps/dashboard/prototype-navigation.html`

## 1. Objetivo

Uniformizar a apresentação das telas Início, TracePoints, Técnico, Configurações e Exportar do protótipo navegável. A tela Início desenhada no frame `4:214` do Figma é a referência visual canônica. As demais telas preservam conteúdo e estrutura funcional próprios, mas passam a compartilhar a mesma identidade, densidade, hierarquia e qualidade de acabamento.

## 2. Escopo

### Incluído

- Alterar somente `apps/dashboard/prototype-navigation.html`.
- Manter o protótipo em um único arquivo HTML, sem build, bibliotecas ou dependências externas.
- Aproximar a tela Início do frame `4:214` do Figma.
- Padronizar TracePoints, Técnico, Configurações e Exportar com a linguagem visual derivada da tela Início.
- Refinar layout, tipografia, cores, bordas, espaçamento, ícones, estados interativos e responsividade desktop.
- Manter a navegação entre telas em JavaScript simples.
- Usar SVGs embutidos para ícones consistentes e disponíveis offline.

### Fora do escopo

- Alterar `apps/dashboard/src` ou implementar o layout no React real.
- Modificar contratos, dados, regras de negócio ou integrações IPC.
- Criar novas telas ou fluxos.
- Adicionar comportamento mobile completo.
- Adicionar bibliotecas, CDN, fontes remotas ou pipeline de assets.

## 3. Direção visual

A interface mantém a estética dark industrial do Figma: compacta, técnica e sóbria. O acabamento deve parecer uma ferramenta desktop de diagnóstico, não um dashboard web genérico.

### Tokens principais

- Fundo: `#0b0c0f`.
- Superfície: `#111318`.
- Bordas: `#282c33`.
- Texto principal: `#f3f4f6`.
- Texto secundário: `#969ba4`.
- Coral: `#ff4d38`, reservado para ações primárias, incidentes e destaques críticos.
- Verde: `#46cc83`, reservado para estados saudáveis.
- Âmbar: `#e8ae4a`, reservado para atenção e degradação.
- Raios: `4px`, `6px` e `8px`.
- Espaçamento: escala de `4px`, `8px`, `12px`, `16px`, `20px`, `24px` e `32px`.

### Tipografia

- Usar `Geist`, quando instalada, com fallback para `Inter`, `Segoe UI` e `sans-serif`.
- Usar `Geist Mono`, quando instalada, com fallback para `ui-monospace` e `monospace`.
- Reservar a fonte mono para status, horários, métricas e prévias técnicas.
- Preservar hierarquia compacta: títulos de tela, subtítulos, títulos de card, labels e metadados claramente distintos.

### Elementos comuns

- Header e sidebar têm composição e dimensões consistentes em todas as telas.
- Cards compartilham superfícies, bordas, raios e paddings.
- Botões, chips, filtros, inputs, selects e toggles compartilham estados normal, hover, focus-visible e active; controles indisponíveis também têm estado disabled consistente.
- Ícones usam SVG inline com `currentColor`, traço e dimensões uniformes.
- Sombras decorativas não são usadas; separação ocorre por contraste de superfície e borda.

## 4. Estrutura das telas

### Início

Reproduzir a intenção do frame do Figma:

- cabeçalho com marca, indicador de monitoramento, horário da última atualização e ação “Travou agora”;
- sidebar compacta com ícone e label;
- diagnóstico principal com título e explicação;
- caminho visual Seu PC → Wi-Fi / Rede → Gateway Local → Provedor / ISP → Servidor;
- histórico contínuo com legenda e marcadores de eventos;
- card explicativo de TracePoints com estado dos sensores e CTA.

### TracePoints

- Manter filtros por origem e período.
- Transformar os eventos em linhas/cards densos e consistentes.
- Evidenciar horário, origem, título, resumo, severidade e ação sem depender apenas de cor.
- Usar chips padronizados para “Automático” e “Manual”.

### Técnico

- Manter os quatro indicadores principais.
- Apresentá-los como cards métricos padronizados, com valores em fonte mono.
- Manter dois gráficos, usando cards, legendas, grade e cores consistentes com o histórico da tela Início.

### Configurações

- Manter menu interno para Coleta, Alvos, Armazenamento, Inicialização e Privacidade.
- Organizar configurações em grupos/cards claros.
- Padronizar labels, descrições, selects e toggles.
- Fixar hierarquia clara entre navegação local, conteúdo e ação de salvar.

### Exportar

- Manter opções de conteúdo, período, prévia anonimizada e ação de exportação.
- Organizar seleção e prévia em cards equilibrados.
- Usar fonte mono na prévia.
- Destacar aviso de privacidade e CTA sem introduzir novo fluxo.

## 5. Interação e acessibilidade

- A navegação continua trocando a seção ativa sem recarregar a página.
- O item ativo recebe `aria-current="page"`.
- Controles usam elementos HTML nativos sempre que possível.
- Todos os controles interativos têm foco visível por teclado.
- Ícones decorativos não geram ruído para tecnologias assistivas.
- Cor não é o único indicador de estado ou severidade.
- Contraste de texto e controles busca conformidade WCAG AA.
- Transições são discretas e desativadas com `prefers-reduced-motion: reduce`.

## 6. Responsividade

O alvo é desktop responsivo entre `1024px` e `1440px`.

- O shell ocupa o viewport sem margem decorativa externa.
- Em larguras menores, grids de duas colunas passam para uma coluna.
- O caminho de diagnóstico preserva legibilidade; pode reduzir gaps e dimensões antes de recorrer a overflow horizontal.
- Configurações preserva menu lateral enquanto houver espaço útil; abaixo do breakpoint definido, o menu se torna uma faixa horizontal.
- Não é necessário projetar navegação mobile nem suportar viewport abaixo de `1024px` como experiência principal.

## 7. Validação

Validar manualmente o arquivo em navegador nas larguras `1024px`, `1280px` e `1440px`.

Critérios de aceite:

1. Todas as cinco telas navegam corretamente.
2. A tela Início reconhecidamente segue a referência do Figma.
3. As outras telas parecem partes do mesmo produto, sem perder seu conteúdo específico.
4. Header, sidebar, cards, formulários, filtros, chips, métricas e ações usam padrões consistentes.
5. Não há dependências de rede, build ou biblioteca externa.
6. Não há overflow ou sobreposição que impeça leitura entre `1024px` e `1440px`.
7. Navegação por teclado apresenta foco visível e estado ativo semanticamente identificável.
8. O protótipo continua contido em `apps/dashboard/prototype-navigation.html`.
