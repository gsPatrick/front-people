// CRIE O ARQUIVO: src/components/Modals/AICachePromptModal.jsx

import React from 'react';
import styles from './AICachePromptModal.module.css';

// Função helper para formatar datas relativas
const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const past = new Date(timestamp);
    const seconds = Math.floor((now - past) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " anos atrás";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " meses atrás";
    interval = seconds / 86400;
    if (interval > 1) return "há " + Math.floor(interval) + " dias";
    interval = seconds / 3600;
    if (interval > 1) return "há " + Math.floor(interval) + " horas";
    interval = seconds / 60;
    if (interval > 1) return "há " + Math.floor(interval) + " minutos";
    return "agora mesmo";
};


const AICachePromptModal = ({ cacheInfo, onUseCache, onForceRefresh, onClose }) => {
    const lastScraped = formatTimeAgo(cacheInfo.lastScrapedAt);

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h3>Análise com Inteligência Artificial</h3>
                </div>
                <div className={styles.modalBody}>
                    <p className={styles.infoText}>
                        Já possuímos uma análise deste perfil realizada <strong>{lastScraped}</strong>.
                    </p>
                    <p className={styles.questionText}>
                        Como você deseja prosseguir?
                    </p>
                </div>
                <div className={styles.modalActions}>
                    <button onClick={onUseCache} className={styles.primaryButton}>
                        Usar Dados Atuais <span className={styles.buttonHint}>(Rápido)</span>
                    </button>
                    <button onClick={onForceRefresh} className={styles.secondaryButton}>
                        Atualizar e Analisar <span className={styles.buttonHint}>(Lento)</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AICachePromptModal;