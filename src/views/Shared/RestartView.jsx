// src/views/Shared/RestartView.jsx

import React from 'react';
import styles from './RestartView.module.css';

const RestartView = () => {
  return (
    <div className={styles.container}>
      <div className={styles.icon}>✓</div>
      <h2 className={styles.title}>Configuração Salva!</h2>
      <p className={styles.message}>
        Para aplicar a nova configuração de visualização, por favor, feche este painel e clique no ícone da extensão novamente.
      </p>
      <button 
        className={styles.closeButton} 
        onClick={() => window.close()} // Fecha o popup/painel
      >
        Entendido, Fechar
      </button>
    </div>
  );
};

export default RestartView;