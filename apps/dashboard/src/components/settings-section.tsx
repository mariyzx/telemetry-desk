import { useState } from 'react';
import { PlaceholderNote } from './placeholder-note.js';

const SETTINGS_TABS = [
  'Coleta',
  'Alvos',
  'Armazenamento',
  'Inicialização',
  'Privacidade',
] as const;

type SettingsTab = (typeof SETTINGS_TABS)[number];

function SettingsPanelActions() {
  return (
    <div className="form-actions">
      <button type="button" className="primary button" disabled>
        Salvar alterações
      </button>
    </div>
  );
}

function ColetaPanel() {
  return (
    <>
      <div className="group">
        <h3>Monitoramento de rede</h3>
        <p>Frequências padrão equilibram precisão e consumo.</p>
        <label className="field-row" htmlFor="cfg-gateway">
          <span>Gateway</span>
          <select id="cfg-gateway" disabled>
            <option>A cada 1 segundo</option>
          </select>
        </label>
        <label className="field-row" htmlFor="cfg-internet">
          <span>Internet</span>
          <select id="cfg-internet" disabled>
            <option>A cada 2 segundos</option>
          </select>
        </label>
        <label className="field-row" htmlFor="cfg-dns">
          <span>DNS sintético</span>
          <select id="cfg-dns" disabled>
            <option>A cada 30 segundos</option>
          </select>
        </label>
      </div>
      <div className="group">
        <h3>Execução contínua</h3>
        <p>O coletor continua ativo quando a janela é fechada.</p>
        <label className="field-row" htmlFor="cfg-battery">
          <span>Reduzir coleta em bateria</span>
          <input id="cfg-battery" className="toggle" type="checkbox" defaultChecked disabled />
        </label>
      </div>
      <SettingsPanelActions />
    </>
  );
}

function AlvosPanel() {
  return (
    <>
      <div className="group">
        <h3>Destinos públicos</h3>
        <p>Dois alvos configuráveis para checagem de internet.</p>
        <label className="field-row" htmlFor="cfg-primary">
          <span>Alvo primário</span>
          <input id="cfg-primary" type="text" defaultValue="1.1.1.1" disabled />
        </label>
        <label className="field-row" htmlFor="cfg-secondary">
          <span>Alvo secundário</span>
          <input id="cfg-secondary" type="text" defaultValue="8.8.8.8" disabled />
        </label>
      </div>
      <div className="group">
        <h3>Alvo de jogo (opcional)</h3>
        <p>Host ou endpoint do servidor monitorado.</p>
        <label className="field-row" htmlFor="cfg-game">
          <span>Servidor de jogo</span>
          <input id="cfg-game" type="text" placeholder="Não definido" disabled />
        </label>
      </div>
      <PlaceholderNote>
        Edição de alvos indisponível nesta versão — sem bridge de settings.
      </PlaceholderNote>
      <SettingsPanelActions />
    </>
  );
}

function ArmazenamentoPanel() {
  return (
    <>
      <div className="group">
        <h3>Retenção local</h3>
        <p>Dados permanecem no dispositivo; faixas protegidas por TracePoints têm retenção longa.</p>
        <label className="field-row" htmlFor="cfg-retention-metrics">
          <span>Métricas agregadas</span>
          <select id="cfg-retention-metrics" disabled>
            <option>30 dias</option>
          </select>
        </label>
        <label className="field-row" htmlFor="cfg-retention-tp">
          <span>TracePoints e evidências</span>
          <select id="cfg-retention-tp" disabled>
            <option>1 ano</option>
          </select>
        </label>
      </div>
      <PlaceholderNote>
        Política de retenção não é editável nesta versão — valores ilustrativos.
      </PlaceholderNote>
      <SettingsPanelActions />
    </>
  );
}

function InicializacaoPanel() {
  return (
    <>
      <div className="group">
        <h3>Inicialização do aplicativo</h3>
        <p>O coletor continua ativo quando a janela é fechada; sair encerra tudo.</p>
        <label className="field-row" htmlFor="cfg-startup">
          <span>Iniciar com o Windows</span>
          <input id="cfg-startup" className="toggle" type="checkbox" defaultChecked disabled />
        </label>
        <label className="field-row" htmlFor="cfg-tray">
          <span>Abrir no system tray</span>
          <input id="cfg-tray" className="toggle" type="checkbox" defaultChecked disabled />
        </label>
      </div>
      <PlaceholderNote>
        Autostart e tray não são configuráveis pelo dashboard nesta versão.
      </PlaceholderNote>
      <SettingsPanelActions />
    </>
  );
}

function PrivacidadePanel() {
  return (
    <>
      <div className="group">
        <h3>Privacidade local</h3>
        <p>Sem conta, cloud ou telemetria externa. Exportação remove identificadores por padrão.</p>
        <label className="field-row" htmlFor="cfg-anon">
          <span>Anonimizar exportações</span>
          <input id="cfg-anon" className="toggle" type="checkbox" defaultChecked disabled />
        </label>
        <label className="field-row" htmlFor="cfg-dns-observe">
          <span>Observar DNS do usuário</span>
          <input id="cfg-dns-observe" className="toggle" type="checkbox" disabled />
        </label>
      </div>
      <PlaceholderNote>
        Preferências de privacidade são fixas no produto nesta versão — sem IPC de settings.
      </PlaceholderNote>
      <SettingsPanelActions />
    </>
  );
}

function SettingsTabPanel({ tab }: { tab: SettingsTab }) {
  switch (tab) {
    case 'Coleta':
      return <ColetaPanel />;
    case 'Alvos':
      return <AlvosPanel />;
    case 'Armazenamento':
      return <ArmazenamentoPanel />;
    case 'Inicialização':
      return <InicializacaoPanel />;
    case 'Privacidade':
      return <PrivacidadePanel />;
  }
}

export function SettingsSection() {
  const [tab, setTab] = useState<SettingsTab>('Coleta');

  return (
    <section className="screen screen--settings is-active" aria-labelledby="config-title">
      <div className="title">
        <h1 id="config-title">Configurações</h1>
        <p>Controle coleta, destinos, retenção e inicialização.</p>
      </div>

      <PlaceholderNote>
        Persistência de configurações indisponível nesta versão — controles apenas visuais.
      </PlaceholderNote>

      <div className="card settings-layout">
        <aside className="settings-nav" aria-label="Seções de configuração">
          {SETTINGS_TABS.map((name) => (
            <button
              key={name}
              type="button"
              aria-current={tab === name ? true : undefined}
              onClick={() => setTab(name)}
            >
              {name}
            </button>
          ))}
        </aside>
        <div className="form-section" aria-live="polite">
          <SettingsTabPanel tab={tab} />
        </div>
      </div>
    </section>
  );
}
