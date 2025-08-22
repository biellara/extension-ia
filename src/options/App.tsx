// switches: Captura automática ON/OFF, Anonimização ON, Retenção (7/15/30), Limite (500/1000/2000).
// lê/grava no storage (através do wrapper em /common/storage).
import  { useState, useEffect } from 'react';
import { getAppSettings, saveAppSettings, AppSettings } from '../common/storage/settings';
import { safeSendMessage } from '../common/messaging/safeSend';
import { MSG_CLEAR_ALL_DATA } from '../common/messaging/channels';
import './options.css';

const App = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    getAppSettings().then(setSettings);
  }, []);

  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    if (!settings) return;
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveAppSettings(newSettings).then(() => {
      setStatusMessage('Configuração salva!');
      setTimeout(() => setStatusMessage(''), 2000);
    });
  };

  const handleClearAllData = () => {
    if (window.confirm('ATENÇÃO: Isso apagará TODOS os dados de TODAS as conversas salvas. Esta ação não pode ser desfeita. Deseja continuar?')) {
      safeSendMessage({ type: MSG_CLEAR_ALL_DATA }).then(() => {
        alert('Todos os dados foram apagados com sucesso.');
      });
    }
  };

  if (!settings) {
    return <div>Carregando configurações...</div>;
  }

  return (
    <div className="options-container">
      <h1>Configurações da Extensão Echo</h1>

      <div className="settings-section">
        <h2>Retenção de Dados</h2>
        <div className="setting-item">
          <label htmlFor="retentionDays">Manter dados por:</label>
          <select
            id="retentionDays"
            value={settings.retentionDays}
            onChange={(e) => handleSettingChange('retentionDays', parseInt(e.target.value, 10))}
          >
            <option value="7">7 dias</option>
            <option value="15">15 dias</option>
            <option value="30">30 dias</option>
          </select>
        </div>
        <div className="setting-item">
          <label htmlFor="messageLimit">Limite de mensagens por conversa:</label>
          <select
            id="messageLimit"
            value={settings.messageLimit}
            onChange={(e) => handleSettingChange('messageLimit', parseInt(e.target.value, 10))}
          >
            <option value="500">500 mensagens</option>
            <option value="1000">1000 mensagens</option>
            <option value="2000">2000 mensagens</option>
          </select>
        </div>
      </div>

      <div className="privacy-section">
        <h2>Política de Privacidade</h2>
        <div className="privacy-policy">
          <p><strong>As conversas ficam salvas apenas localmente no seu navegador. Nada é enviado para fora sem sua autorização explícita.</strong></p>
          <ul>
            <li>Todos os dados de atendimento são coletados e armazenados apenas no seu computador.</li>
            <li>Você pode apagar conversas individuais ou todos os dados a qualquer momento.</li>
            <li>Por padrão, mantemos os dados conforme as configurações de retenção acima.</li>
            <li>Dados sensíveis (como CPF/telefone) não são tratados de forma especial, mas nunca saem do seu navegador.</li>
          </ul>
        </div>
      </div>

      <div className="danger-zone">
        <h2>Zona de Perigo</h2>
        <div className="setting-item">
          <label>Apagar todos os dados:</label>
          <button onClick={handleClearAllData}>Limpar Tudo</button>
        </div>
      </div>

      {statusMessage && <div className="status-message">{statusMessage}</div>}
    </div>
  );
};

export default App;
