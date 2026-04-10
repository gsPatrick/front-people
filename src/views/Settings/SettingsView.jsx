// src/views/Settings/SettingsView.jsx

import React, { useState, useEffect } from 'react';
import styles from './SettingsView.module.css';
import Header from '../../components/Header/Header';
import { useChat } from '../../hooks/useChat';
import { BsCheck, BsPencil } from 'react-icons/bs';

const SettingsView = ({
  settings,
  onSettingChange
}) => {
  const { suggestions, updateSuggestions, loadSettings } = useChat();
  const [localSuggestions, setLocalSuggestions] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalSuggestions(suggestions || []);
  }, [suggestions]);

  const handleSaveSuggestions = async () => {
    setIsSaving(true);
    const res = await updateSuggestions(localSuggestions);
    setIsSaving(false);
    if (res.success) {
      setIsEditing(false);
    } else {
      alert('Erro ao salvar sugestões: ' + res.error);
    }
  };

  const handleSuggestionChange = (index, value) => {
    const newSugs = [...localSuggestions];
    newSugs[index] = value;
    setLocalSuggestions(newSugs);
  };

  return (
    <div className={styles.container}>
      <Header title="Configurações" subtitle="Ajustes da extensão e funcionalidades" />

      <main className={styles.settingsContent}>

        <section className={styles.settingSection}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>🤖 Ana Issidoro AI</h3>
          </div>
          
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
            Exibe o botal de Match IA nos currículos e permite o chat com a Ana.
          </p>

          <div className={styles.suggestionsContainer}>
             <div className={styles.suggestionsHeader}>
                <span className={styles.settingLabel}>Sugestões de Mensagens</span>
                {!isEditing ? (
                  <button className={styles.editBtn} onClick={() => setIsEditing(true)}>
                    <BsPencil /> Editar
                  </button>
                ) : (
                  <button className={styles.saveBtn} onClick={handleSaveSuggestions} disabled={isSaving}>
                    <BsCheck /> {isSaving ? 'Salvando...' : 'Salvar'}
                  </button>
                )}
             </div>
             <div className={styles.suggestionsList}>
                {localSuggestions.map((sug, idx) => (
                  <input
                    key={idx}
                    className={styles.suggestionInput}
                    value={sug}
                    onChange={(e) => handleSuggestionChange(idx, e.target.value)}
                    disabled={!isEditing}
                    placeholder={`Sugestão ${idx + 1}`}
                  />
                ))}
             </div>
          </div>
        </section>

        <section className={styles.settingSection}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>⚙️ Geral</h3>
          </div>
          <div className={styles.settingItem}>
            <label className={styles.settingLabel}>Persistência de Sessão</label>
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
            Lembra a última tela visitada ao reabrir a extensão.
          </p>
        </section>

        <section className={styles.settingSection}>
          <div className={styles.settingItem} onClick={() => onSettingChange('navigate', 'ai_memory')} style={{ cursor: 'pointer' }}>
            <label className={styles.settingLabel} style={{ cursor: 'pointer', color: 'var(--primary)' }}>
              🧠 Gerenciar Memória da IA
            </label>
            <span className={styles.arrow}>→</span>
          </div>
          <p className={styles.settingDescription}>
            Ensine termos específicos para a IA melhorar a precisão dos Matches.
          </p>
        </section>

      </main>
    </div>
  );
};

export default SettingsView;