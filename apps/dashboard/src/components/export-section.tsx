import { IconShield } from './icons.js';
import { PlaceholderNote } from './placeholder-note.js';

const PREVIEW = `{
  "period": "24h",
  "networkSamples": 8421,
  "tracePoints": 3,
  "gatewayHost": "removed",
  "ssid": "removed",
  "interfaceName": "removed",
  "privacy": "anonymized"
}`;

export function ExportSection() {
  return (
    <section className="screen is-active" aria-labelledby="exportar-title">
      <div className="title">
        <h1 id="exportar-title">Exportar diagnóstico</h1>
        <p>Gere um snapshot local anonimizado para análise ou suporte.</p>
      </div>

      <PlaceholderNote>
        Exportação real indisponível nesta versão — prévia ilustrativa apenas.
      </PlaceholderNote>

      <div className="export-grid">
        <div className="card panel checks">
          <h2>Conteúdo da exportação</h2>
          <label className="check-option" htmlFor="exp-metrics">
            <input id="exp-metrics" type="checkbox" defaultChecked disabled />{' '}
            <span>Métricas de rede e agregados</span>
          </label>
          <label className="check-option" htmlFor="exp-trace">
            <input id="exp-trace" type="checkbox" defaultChecked disabled />{' '}
            <span>TracePoints e evidências</span>
          </label>
          <label className="check-option" htmlFor="exp-caps">
            <input id="exp-caps" type="checkbox" defaultChecked disabled />{' '}
            <span>Capabilities e versão do aplicativo</span>
          </label>
          <label className="check-option" htmlFor="exp-sys">
            <input id="exp-sys" type="checkbox" disabled />{' '}
            <span>Métricas detalhadas do sistema</span>
          </label>
          <div className="group">
            <h3>Período</h3>
            <label className="field-row" htmlFor="exp-period" style={{ gridTemplateColumns: '1fr' }}>
              <select id="exp-period" className="filter" disabled>
                <option>Últimas 24 horas</option>
                <option>Últimos 7 dias</option>
              </select>
            </label>
          </div>
          <button type="button" className="primary button" disabled>
            Escolher destino e exportar
          </button>
        </div>
        <aside className="card preview">
          <h2>Prévia anonimizada</h2>
          <pre className="code-preview">
            <code>{PREVIEW}</code>
          </pre>
          <p className="privacy-note">
            <IconShield />
            <span>Hosts, IPs, SSID, MAC e caminhos locais são removidos por padrão.</span>
          </p>
        </aside>
      </div>
    </section>
  );
}
