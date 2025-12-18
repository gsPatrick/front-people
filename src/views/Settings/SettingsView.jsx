// COLE ESTE CÓDIGO NO ARQUIVO: src/views/Settings/SettingsView.jsx

import React from 'react';
import styles from './SettingsView.module.css';
import Header from '../../components/Header/Header';

const SettingsView = ({
    settings,
    onSettingChange
}) => {
  return (
    <div className={styles.container}>
      <Header title="Configurações" subtitle="Ajustes da extensão e funcionalidades" />
      
      <main className={styles.settingsContent}>
        
        {/* A SEÇÃO DO MODO PAINEL LATERAL FOI REMOVIDA DAQUI */}

        <section className={styles.settingSection}>
          <div className={styles.settingItem}>
            <label className={styles.settingLabel}>Habilitar Persistência de Sessão</label>
            <label className={styles.toggleSwitch}>
              <input 
                type="checkbox" 
                checked={settings.isPersistenceEnabled} 
                onChange={() => onSettingChange('isPersistenceEnabled', !settings.isPersistenceEnabled)} 
              />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>
          <p className={styles.settingDescription}>
            Quando ativado, a extensão irá lembrar a última tela que você estava visitando ao ser reaberta.
          </p>
        </section>

        <section className={styles.settingSection}>
          <div className={styles.settingItem}>
            <label className={styles.settingLabel}>Habilitar Modo "Tela Cheia"</label>
            <label className={styles.toggleSwitch}>
              <input 
                type="checkbox" 
                checked={settings.isOpenInTabEnabled} 
                onChange={() => onSettingChange('isOpenInTabEnabled', !settings.isOpenInTabEnabled)} 
              />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>
          <p className={styles.settingDescription}>
            Ativa um botão no menu que permite abrir a interface em uma nova aba do navegador para uma visualização expandida.
          </p>
        </section>

        <section className={styles.settingSection}>
          <div className={styles.settingItem}>
            <label className={styles.settingLabel}>Habilitar Assistente de IA</label>
            <label className={styles.toggleSwitch}>
              <input 
                type="checkbox" 
                checked={settings.isAIEnabled} 
                onChange={() => onSettingChange('isAIEnabled', !settings.isAIEnabled)} 
              />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>
          <p className={styles.settingDescription}>
            Exibe um botão de **IA** nos scorecards para preencher automaticamente as notas e justificativas com base no perfil do candidato.
          </p>
        </section>

      </main>
    </div>
  );
};

export default SettingsView;