// src/views/Settings/SettingsView.jsx

import React, { useState, useEffect } from 'react';
import styles from './SettingsView.module.css';
import Header from '../../components/Header/Header';
import { useChat } from '../../hooks/useChat';
import { BsCheck, BsPencil, BsShieldLock } from 'react-icons/bs';
import { loadAuthData } from '../../services/session.service';

const SettingsView = ({
  settings,
  onSettingChange
}) => {
  const { suggestions, updateSuggestions, loadSettings } = useChat();
  const [localSuggestions, setLocalSuggestions] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const authData = loadAuthData();
  const isAdmin = authData?.user?.role === 'admin';

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
          
          <p className={styles.settingDescription}>
            Configurações e sugestões para a assistente Ana Issidoro.
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

        </section>

        {/* Removido o link duplicado aqui, agora está centralizado no Painel Admin na Sidebar */}

      </main>
    </div>
  );
};

export default SettingsView;