// CRIE O ARQUIVO: src/views/Shared/ScrapingView.jsx

import React from 'react';
import styles from './ScrapingView.module.css';

const ScrapingView = () => {
  return (
    <div className={styles.container}>
      <div className={styles.loader}></div>
      <h2 className={styles.title}>Analisando Perfil...</h2>
      <p className={styles.subtitle}>
        Lendo os dados da página do LinkedIn. Isso levará apenas um instante.
      </p>
    </div>
  );
};

export default ScrapingView;