// src/views/AnaKnowledge/KnowledgeModelDetail.jsx
import React, { useState, useEffect } from 'react';
import styles from './AnaKnowledgeView.module.css'; // Reutilizando alguns estilos
import detailStyles from './KnowledgeModelDetail.module.css';
import { useAnaKnowledge } from '../../hooks/useAnaKnowledge';
import { BsArrowLeft, BsPlus, BsFilePdf, BsTrash, BsTag, BsChevronRight } from 'react-icons/bs';
import PdfImportModal from './PdfImportModal';

const KnowledgeModelDetail = ({ model, onBack }) => {
    const { 
        entries, isLoading, loadEntries, saveEntry, deleteEntry 
    } = useAnaKnowledge();

    const [showModal, setShowModal] = useState(false);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);

    useEffect(() => {
        loadEntries(model.id);
    }, [model.id, loadEntries]);

    const handleSave = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        // Tratar keywords de string para array
        if (data.keywords) {
            data.keywords = data.keywords.split(',').map(k => k.trim()).filter(k => k);
        }

        if (editingEntry?.id) data.id = editingEntry.id;

        const res = await saveEntry(model.id, data);
        if (res.success) {
            setShowModal(false);
            setEditingEntry(null);
        } else {
            alert('Erro ao salvar entry: ' + res.error);
        }
    };

    const handleOpenModal = (entry = null) => {
        setEditingEntry(entry);
        setShowModal(true);
    };

    return (
        <div className={styles.container}>
            <div className={detailStyles.header}>
                <button className={detailStyles.backBtn} onClick={onBack}>
                    <BsArrowLeft /> Voltar
                </button>
                <div className={detailStyles.headerInfo}>
                    <h2 className={detailStyles.title}>{model.name}</h2>
                    <p className={detailStyles.subtitle}>{entries.length} blocos de conhecimento</p>
                </div>
                <div className={detailStyles.actions}>
                    <button className={detailStyles.pdfBtn} onClick={() => setShowPdfModal(true)}>
                        <BsFilePdf /> Importar PDF
                    </button>
                    <button className={styles.addBtn} onClick={() => handleOpenModal()}>
                        <BsPlus /> Novo Bloco
                    </button>
                </div>
            </div>

            <div className={detailStyles.entriesList}>
                {entries.length === 0 && !isLoading && (
                    <div className={detailStyles.empty}>
                        <p>Nenhum conhecimento cadastrado para este modelo.</p>
                        <p>Adicione manualmente ou importe um PDF.</p>
                    </div>
                )}

                {entries.map(entry => (
                    <div key={entry.id} className={detailStyles.entryCard}>
                        <div className={detailStyles.entryMain} onClick={() => handleOpenModal(entry)}>
                            <div className={detailStyles.entryHeader}>
                                <h4 className={detailStyles.entryTitle}>{entry.title}</h4>
                                <div className={detailStyles.entryKeywords}>
                                    {entry.keywords?.map((k, i) => (
                                        <span key={i} className={detailStyles.keywordBadge}>
                                            <BsTag /> {k}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <p className={detailStyles.entryContent}>{entry.content}</p>
                        </div>
                        <button 
                            className={detailStyles.deleteBtn}
                            onClick={() => { if(window.confirm('Deletar este bloco?')) deleteEntry(entry.id, model.id); }}
                        >
                            <BsTrash />
                        </button>
                    </div>
                ))}
            </div>

            {/* MODAL DE ENTRY MANUAL */}
            {showModal && (
                <>
                    <div className={styles.overlay} onClick={() => setShowModal(false)} />
                    <div className={styles.modal} style={{ maxWidth: '700px' }}>
                        <h3>{editingEntry ? 'Editar' : 'Criar'} Bloco de Conhecimento</h3>
                        <form onSubmit={handleSave}>
                            <div className={styles.formField}>
                                <label className={styles.label}>Título do Bloco</label>
                                <input name="title" className={styles.input} defaultValue={editingEntry?.title} required />
                            </div>
                            <div className={styles.formField}>
                                <label className={styles.label}>Palavras-chave (separadas por vírgula)</label>
                                <input 
                                    name="keywords" 
                                    className={styles.input} 
                                    defaultValue={editingEntry?.keywords?.join(', ')} 
                                    placeholder="ex: salário, benefícios, home office"
                                />
                                <small style={{ color: 'var(--text-secondary)' }}>A Ana usará estas palavras para recuperar este contexto.</small>
                            </div>
                            <div className={styles.formField}>
                                <label className={styles.label}>Conteúdo do Conhecimento</label>
                                <textarea name="content" className={styles.textarea} style={{ height: '200px' }} defaultValue={editingEntry?.content} required />
                            </div>

                            <div className={styles.formActions}>
                                <button type="button" className={styles.cancelBtn} onClick={() => setShowModal(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className={styles.submitBtn} disabled={isLoading}>
                                    {isLoading ? 'Salvando...' : 'Salvar Bloco'}
                                </button>
                            </div>
                        </form>
                    </div>
                </>
            )}

            {/* MODAL DE IMPORTAÇÃO PDF */}
            {showPdfModal && (
                <PdfImportModal 
                    modelId={model.id} 
                    onClose={() => setShowPdfModal(false)} 
                    onSuccess={() => { setShowPdfModal(false); loadEntries(model.id); }} 
                />
            )}
        </div>
    );
};

export default KnowledgeModelDetail;
