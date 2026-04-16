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
    const [phase, setPhase] = useState('upload'); 

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
            setSelectedIndexes(res.blocks.map((_, i) => i));
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
            <div className="iosOverlay" onClick={onClose} />
            <div className="iosModal" style={{ height: 'auto', maxHeigh: '85vh', borderRadius: '20px 20px 0 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ margin: 0, fontWeight: 700 }}>Importar de PDF</h3>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', color: 'var(--ios-text-secondary)' }}><BsXLg /></button>
                </div>

                {phase === 'upload' && (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <BsFileEarmarkPdf size={48} style={{ color: 'var(--ios-primary)', marginBottom: '16px' }} />
                        <p style={{ fontSize: '0.9rem', color: 'var(--ios-text-secondary)', marginBottom: '24px' }}>
                            Selecione um documento para que a Ana extraia os conhecimentos.
                        </p>
                        
                        <input 
                            type="file" 
                            accept=".pdf" 
                            className="iosInput"
                            onChange={handleFileChange} 
                            style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderStyle: 'dashed' }}
                        />

                        <div className="iosActionButtons" style={{ marginTop: '30px' }}>
                            <button className="iosBtn iosBtnPrimary" onClick={handleExtract} disabled={!file || isLoading}>
                                {isLoading ? 'Analisando...' : 'Analisar Documento'}
                            </button>
                        </div>
                    </div>
                )}

                {phase === 'results' && (
                    <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--ios-text-secondary)' }}>
                            {extractedBlocks.length} blocos encontrados. Selecione para importar:
                        </p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                            {extractedBlocks.map((block, idx) => (
                                <div 
                                    key={idx} 
                                    className="anaCard"
                                    style={{ 
                                        padding: '12px',
                                        border: `1px solid ${selectedIndexes.includes(idx) ? 'var(--ios-primary)' : 'transparent'}`,
                                        opacity: selectedIndexes.includes(idx) ? 1 : 0.6
                                    }}
                                    onClick={() => toggleSelection(idx)}
                                >
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                        <div style={{ 
                                            width: '20px', 
                                            height: '20px', 
                                            borderRadius: '6px', 
                                            background: selectedIndexes.includes(idx) ? 'var(--ios-primary)' : 'rgba(255,255,255,0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            marginTop: '2px'
                                        }}>
                                            {selectedIndexes.includes(idx) && <BsCheckLg size={10} />}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{block.title}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--ios-text-secondary)', marginTop: '4px' }}>
                                                {block.content.substring(0, 80)}...
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="iosActionButtons">
                            <button className="iosBtn iosBtnSecondary" onClick={() => setPhase('upload')}>
                                Voltar
                            </button>
                            <button className="iosBtn iosBtnPrimary" onClick={handleConfirmImport} disabled={selectedIndexes.length === 0 || isLoading}>
                                Importar ({selectedIndexes.length})
                            </button>
                        </div>
                    </div>
                )}

                {phase === 'finishing' && (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <BsCheck2Circle size={64} style={{ color: '#34c759', marginBottom: '16px' }} />
                        <h3 style={{ margin: 0, fontWeight: 700 }}>Integrando Dados</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--ios-text-secondary)', marginTop: '8px' }}>
                            A Ana está organizando o novo conhecimento...
                        </p>
                    </div>
                )}
            </div>
        </>
    );
};

export default PdfImportModal;
