// src/views/AddCandidate/ScrapingView.jsx

import React from 'react';
import styles from './ScrapingView.module.css';
import { BsLinkedin } from 'react-icons/bs';

const ScrapingView = () => {
  return (
    <div className={styles.container}>
      <div className={styles.iconContainer}>
        <BsLinkedin />
      </div>
      <h2 className={styles.title}>Analisando Perfil LinkedIn</h2>
      <p className={styles.subtitle}>
        Aguarde, estamos coletando os dados e verificando se este talento já existe em sua base...
      </p>
      <div className={styles.spinner}></div>
    </div>
  );
};

export default ScrapingView;