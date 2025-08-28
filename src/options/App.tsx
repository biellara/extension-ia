import React, { useState, useEffect } from 'react';
import { getAppSettings, saveAppSettings, AppSettings, WidgetPosition } from '../common/storage/settings';
import { safeSendMessage } from '../common/messaging/safeSend';
import { MSG_CLEAR_ALL_DATA } from '../common/messaging/channels';
import './options.css';

const App = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    getAppSettings().then(setSettings);
  }, []);

  const handleSettingChange = (key: keyof AppSettings, value: unknown) => {
    if (!settings) return;
    
    let parsedValue = value;
    if (key === 'retentionDays' || key === 'messageLimit' || key === 'contextWindowSize') {
      parsedValue = parseInt(value as string, 10);
    }

    const newSettings = { ...settings, [key]: parsedValue };
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
        <h2>Posicionamento do Widget</h2>
        <div className="position-selector-container">
            <p>Escolha onde o widget deve aparecer na tela.</p>
            <div className="position-map">
                {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as WidgetPosition[]).map(pos => (
                    <div 
                        key={pos}
                        className={`position-quadrant ${settings.widgetPosition === pos ? 'active' : ''}`}
                        title={`Posicionar no canto ${pos.replace('-', ' ')}`}
                        onClick={() => handleSettingChange('widgetPosition', pos)}
                    />
                ))}
            </div>
        </div>
      </div>

      <div className="settings-section">
        <h2>Integração com Gemini AI</h2>
        <div className="setting-item">
          <label htmlFor="contextWindowSize">Mensagens para contexto:</label>
          <select
            id="contextWindowSize"
            value={settings.contextWindowSize}
            onChange={(e) => handleSettingChange('contextWindowSize', e.target.value)}
          >
            <option value="30">Últimas 30</option>
            <option value="50">Últimas 50</option>
            <option value="80">Últimas 80</option>
          </select>
        </div>
      </div>

      <div className="settings-section">
        <h2>Retenção de Dados</h2>
        <div className="setting-item">
          <label htmlFor="retentionDays">Manter dados por:</label>
          <select
            id="retentionDays"
            value={settings.retentionDays}
            onChange={(e) => handleSettingChange('retentionDays', e.target.value)}
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
            onChange={(e) => handleSettingChange('messageLimit', e.target.value)}
          >
            <option value="500">500 mensagens</option>
            <option value="1000">1000 mensagens</option>
            <option value="2000">2000 mensagens</option>
          </select>
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
