// SUBSTITUA O ARQUIVO: src/components/Layout/DragDropOverlay.jsx

import React from 'react';
import styles from './DragDropOverlay.module.css';

// Ícones diferentes para cada modo
const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
);
const MatchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.71.71a5.4 5.4 0 0 0 0 7.65l.71.71a5.4 5.4 0 0 0 7.65 0l4.24-4.24a5.4 5.4 0 0 0 0-7.65z"/><path d="M3.58 19.42a5.4 5.4 0 0 0 7.65 0l.71-.71a5.4 5.4 0 0 0 0-7.65L11.23 10.4a5.4 5.4 0 0 0-7.65 0L3.58 14.6a5.4 5.4 0 0 0 0 7.65z"/>
    </svg>
);


const DragDropOverlay = ({ mode = 'add' }) => {
  // Define o conteúdo com base no modo
  const isMatchMode = mode === 'match';
  const icon = isMatchMode ? <MatchIcon /> : <UploadIcon />;
  const title = isMatchMode ? 'Solte para Analisar o Match' : 'Solte para Adicionar Talento';
  const subtitle = isMatchMode 
    ? 'O perfil será analisado contra o scorecard ativo.' 
    : 'O perfil será extraído e adicionado à sua base.';

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <div className={styles.iconContainer}>
          {icon}
        </div>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>
    </div>
  );
};

export default DragDropOverlay;