// CRIE O ARQUIVO: src/views/AddCandidate/ProfileFoundView.jsx

import React from 'react';
import styles from './ProfileFoundView.module.css';

const ProfileFoundView = ({ talent, onGoToProfile, onForceScrape }) => {
  return (
    <div className={styles.container}>
      <div className={styles.iconContainer}>
        <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
      </div>
      
      <p className={styles.prompt}>Este talento já está na sua base de dados:</p>
      <h2 className={styles.candidateName}>{talent.name}</h2>
      <p className={styles.candidateHeadline}>{talent.headline || 'Sem título'}</p>
      
      <div className={styles.buttonGroup}>
        <button onClick={() => onGoToProfile(talent)} className={styles.primaryButton}>
          Ver Perfil na InHire
        </button>
        <button onClick={onForceScrape} className={styles.secondaryButton}>
          Atualizar Dados (Novo Scraping)
        </button>
      </div>
    </div>
  );
};

export default ProfileFoundView;