// src/views/Shared/ScrapingView.jsx

import React from 'react';
import styles from './ScrapingView.module.css';

const ScrapingView = ({ elapsedTime }) => {
  // Formata o tempo para exibir com uma casa decimal (ex: 15.3s)
  const formattedTime = (elapsedTime / 1000).toFixed(1);

  return (
    <div className={styles.container}>
      <div className={styles.loader}></div>
      <h2 className={styles.title}>Extraindo Dados do Perfil...</h2>
      <p className={styles.subtitle}>
        Por favor, aguarde. Este processo pode levar alguns instantes.
      </p>
      <div className={styles.timerBox}>
        <span className={styles.timer}>{formattedTime}s</span>
      </div>
      <p className={styles.footerText}>
        O Phantombuster está trabalhando para coletar as informações.
      </p>
    </div>
  );
};

export default ScrapingView;