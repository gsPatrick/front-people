// CRIE O ARQUIVO: src/views/AddCandidate/UpdatePdfView.jsx

import React, { useState, useCallback, useRef } from 'react';
import styles from './UploadPdfView.module.css'; // Reutilizamos o mesmo estilo

const SyncIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
    </svg>
);
const LoadingSpinner = () => <div className={styles.loadingSpinner}></div>;

const UpdatePdfView = ({ talent, onFileSelect, onCancel }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const processFile = useCallback(async (file) => {
    if (file && file.type === 'application/pdf') {
      setError(null);
      setIsLoading(true);
      try {
        await onFileSelect(file);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    } else {
      setError('Arquivo inválido. Por favor, selecione um arquivo PDF.');
    }
  }, [onFileSelect]);

  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); if (e.dataTransfer.files?.length > 0) { processFile(e.dataTransfer.files[0]); } };
  const handleFileInputChange = (e) => { if (e.target.files?.length > 0) { processFile(e.target.files[0]); } };
  const onZoneClick = () => { if (fileInputRef.current) { fileInputRef.current.click(); } };

  const dropZoneClass = `${styles.dropZone} ${isDragging ? styles.draggingOver : ''}`;

  return (
    <div className={styles.container}>
        <button onClick={onCancel} className={styles.backButton}>&larr; Cancelar Atualização</button>
        <div className={styles.content}>
            <h2 className={styles.title}>Atualizar Dados de {talent?.name || 'Talento'}</h2>
            <p className={styles.subtitle}>
                O download do PDF foi iniciado. Assim que terminar, arraste e solte o arquivo abaixo para sincronizar as informações.
            </p>

            {isLoading ? (
                <div className={styles.loadingContainer}>
                    <LoadingSpinner />
                    <p>Sincronizando os dados...</p>
                </div>
            ) : (
                <div className={dropZoneClass} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop} onClick={onZoneClick}>
                    <input type="file" ref={fileInputRef} onChange={handleFileInputChange} accept="application/pdf" style={{ display: 'none' }} />
                    <div className={styles.dropZoneContent}>
                        <div className={styles.iconContainer}><SyncIcon /></div>
                        <span>Arraste o novo PDF aqui</span>
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

export default UpdatePdfView;