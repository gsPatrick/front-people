// CRIE ESTE NOVO ARQUIVO: src/components/Modals/ExitMatchModeModal.jsx

import React from 'react';
import styles from './ExitMatchModeModal.module.css';

const ExitMatchModeModal = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>Sair do Modo Match?</h3>
        <p className={styles.message}>
          Você está atualmente analisando um perfil. Sair agora irá encerrar a análise. 
          Tem certeza que deseja continuar?
        </p>
        <div className={styles.actions}>
          <button onClick={onCancel} className={styles.cancelButton}>
            Ficar
          </button>
          <button onClick={onConfirm} className={styles.confirmButton}>
            Sim, sair
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExitMatchModeModal;