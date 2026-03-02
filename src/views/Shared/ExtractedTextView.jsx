// CRIE O ARQUIVO: src/views/Shared/ExtractedTextView.jsx

import React from 'react';
import styles from './ExtractedTextView.module.css';
import Header from '../../components/Header/Header';

const ExtractedTextView = ({ text, onBack }) => {
  return (
    <div className={styles.container}>
      <Header 
        title="Texto Extraído do PDF"
        subtitle="Verifique o resultado da extração. Você pode copiar este texto se precisar."
        showBackButton={true}
        onBack={onBack}
      />
      <div className={styles.content}>
        <textarea 
          className={styles.textArea}
          readOnly 
          value={text} 
        />
      </div>
    </div>
  );
};

export default ExtractedTextView;
