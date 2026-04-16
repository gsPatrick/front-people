// src/views/AnaKnowledge/PdfImportModal.jsx
import React, { useState } from 'react';
import styles from './AnaKnowledgeView.module.css';
import { useAnaKnowledge } from '../../hooks/useAnaKnowledge';
import { BsFileEarmarkPdf, BsCheck2Circle, BsXLg, BsCheckLg } from 'react-icons/bs';

const PdfImportModal = ({ modelId, onClose, onSuccess }) => {
    const { extractPdfToBlocks, saveEntry, isLoading } = useAnaKnowledge();
    const [file, setFile] = useState(null);
    const [extractedBlocks, setExtractedBlocks] = useState([]);
    const [selectedIndexes, setSelectedIndexes] = useState([]);
    const [phase, setPhase] = useState('upload'); // upload, results, finishing

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleExtract = async () => {
        if (!file) return;
        const res = await extractPdfToBlocks(file);
        if (res.success && res.blocks) {
            setExtractedBlocks(res.blocks);
            setSelectedIndexes(res.blocks.map((_, i) => i)); // All selected by default
            setPhase('results');
        } else {
            alert('Erro na extração: ' + res.error);
        }
    };

    const toggleSelection = (index) => {
        setSelectedIndexes(prev => 
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
    };

    const handleConfirmImport = async () => {
        setPhase('finishing');
        try {
            const blocksToImport = extractedBlocks.filter((_, i) => selectedIndexes.includes(i));
            
            for (const block of blocksToImport) {
                await saveEntry(modelId, {
                    title: block.title,
                    keywords: block.keywords,
                    content: block.content
                });
            }
            onSuccess();
        } catch (err) {
            alert('Erro ao importar blocos: ' + err.message);
            setPhase('results');
        }
    };

    return (
        <>
            <div className={styles.overlay} onClick={onClose} />
            <div className={styles.modal} style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0 }}>Importar Conhecimento de PDF</h3>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><BsXLg /></button>
                </div>

                {phase === 'upload' && (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <div style={{ fontSize: '4rem', color: 'var(--primary)', marginBottom: '20px' }}>
                            <BsFileEarmarkPdf />
                        </div>
                        <p>Selecione um PDF para que a Ana extraia os conhecimentos automaticamente.</p>
                        <input 
                            type="file" 
                            accept=".pdf" 
                            onChange={handleFileChange} 
                            style={{ margin: '20px 0' }}
                        />
                        <div className={styles.formActions}>
                            <button className={styles.submitBtn} onClick={handleExtract} disabled={!file || isLoading}>
                                {isLoading ? 'Analisando PDF (Aguarde)...' : 'Analisar Documento'}
                            </button>
                        </div>
                    </div>
                )}

                {phase === 'results' && (
                    <div>
                        <p>Encontramos <strong>{extractedBlocks.length} blocos</strong> de conhecimento sugeridos. Selecione quais deseja importar:</p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '20px 0' }}>
                            {extractedBlocks.map((block, idx) => (
                                <div 
                                    key={idx} 
                                    style={{ 
                                        padding: '16px', 
                                        borderRadius: '8px', 
                                        border: `1px solid ${selectedIndexes.includes(idx) ? 'var(--primary)' : 'var(--border-color)'}`,
                                        background: selectedIndexes.includes(idx) ? 'rgba(var(--primary-rgb), 0.05)' : 'var(--bg-tertiary)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        gap: '12px'
                                    }}
                                    onClick={() => toggleSelection(idx)}
                                >
                                    <div style={{ 
                                        width: '24px', 
                                        height: '24px', 
                                        borderRadius: '50%', 
                                        background: selectedIndexes.includes(idx) ? 'var(--primary)' : 'none',
                                        border: `2px solid ${selectedIndexes.includes(idx) ? 'var(--primary)' : 'var(--border-color)'}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white'
                                    }}>
                                        {selectedIndexes.includes(idx) && <BsCheckLg size={12} />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, marginBottom: '4px' }}>{block.title}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                            Keywords: {block.keywords?.join(', ')}
                                        </div>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {block.content}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className={styles.formActions}>
                            <button className={styles.cancelBtn} onClick={() => setPhase('upload')}>
                                Voltar
                            </button>
                            <button className={styles.submitBtn} onClick={handleConfirmImport} disabled={selectedIndexes.length === 0 || isLoading}>
                                {isLoading ? 'Importando...' : `Importar ${selectedIndexes.length} Blocos`}
                            </button>
                        </div>
                    </div>
                )}

                {phase === 'finishing' && (
                    <div style={{ textAlign: 'center', padding: '60px 0' }}>
                        <div style={{ fontSize: '4rem', color: '#52c41a', marginBottom: '20px', animation: 'bounce 2s infinite' }}>
                            <BsCheck2Circle />
                        </div>
                        <h3 className="wizardTitle" style={{ fontSize: '1.5rem', background: 'none', WebkitTextFillColor: 'var(--text-primary)' }}>Processando Inteligência</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>A Ana está integrando o conhecimento ao modelo de especialidade...</p>
                    </div>
                )}
            </div>
        </>
    );
};

export default PdfImportModal;
