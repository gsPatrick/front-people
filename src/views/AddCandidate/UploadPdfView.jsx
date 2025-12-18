// CRIE O ARQUIVO: src/views/AddCandidate/UploadPdfView.jsx

import React, { useState, useCallback, useRef } from 'react';
import styles from './UploadPdfView.module.css';

const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const LoadingSpinner = () => <div className={styles.loadingSpinner}></div>;

const UploadPdfView = ({ onFileSelect, onBack }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const processFile = useCallback((file) => {
    if (file && file.type === 'application/pdf') {
      setError(null);
      setIsLoading(true);
      onFileSelect(file); // A função do hook fará o resto
    } else {
      setError('Arquivo inválido. Por favor, selecione um arquivo PDF.');
    }
  }, [onFileSelect]);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Necessário para o onDrop funcionar
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const onZoneClick = () => {
    // Abre o seletor de arquivos ao clicar na área
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const dropZoneClass = `${styles.dropZone} ${isDragging ? styles.draggingOver : ''}`;

  return (
    <div className={styles.container}>
        <button onClick={onBack} className={styles.backButton}>&larr; Voltar</button>
        <div className={styles.content}>
            <h2 className={styles.title}>Adicionar Talento por PDF</h2>
            <p className={styles.subtitle}>
                Arraste o arquivo PDF do perfil do LinkedIn para a área abaixo ou clique para selecioná-lo.
            </p>

            {isLoading ? (
                <div className={styles.loadingContainer}>
                    <LoadingSpinner />
                    <p>Processando o arquivo...</p>
                </div>
            ) : (
                <div 
                    className={dropZoneClass}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={onZoneClick}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileInputChange}
                        accept="application/pdf"
                        style={{ display: 'none' }}
                    />
                    <div className={styles.dropZoneContent}>
                        <div className={styles.iconContainer}><UploadIcon /></div>
                        <span>Arraste e solte o PDF aqui</span>
                        <span className={styles.orText}>ou</span>
                        <span className={styles.browseButton}>Clique para procurar</span>
                    </div>
                </div>
            )}
            
            {error && <p className={styles.errorText}>{error}</p>}
        </div>
    </div>
  );
};

export default UploadPdfView;