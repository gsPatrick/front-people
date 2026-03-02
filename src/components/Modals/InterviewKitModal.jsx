// src/components/Modals/InterviewKitModal.jsx

import React from 'react';
import styles from './InterviewKitModal.module.css';

const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;

const InterviewKitModal = ({ kits, onSelect, onClose }) => {
    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.content} onClick={(e) => e.stopPropagation()}>
                <header className={styles.header}>
                    {/* ========================================================== */}
                    {/* CORREÇÃO: Adicionado botão de voltar explícito           */}
                    {/* ========================================================== */}
                    <button onClick={onClose} className={styles.backButton}>
                        ←
                    </button>
                    <div className={styles.titleContainer}>
                        <h3 className={styles.title}>Acessar kit de entrevista</h3>
                    </div>
                    <button onClick={onClose} className={styles.closeButton}><CloseIcon /></button>
                </header>
                <main className={styles.main}>
                    <p className={styles.prompt}>Selecione um dos kits de entrevista abaixo para preencher a avaliação.</p>
                    <div className={styles.kitList}>
                        {kits.map(kit => (
                            <button key={kit.id} onClick={() => onSelect(kit)} className={styles.kitButton}>
                                {kit.name}
                            </button>
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default InterviewKitModal;