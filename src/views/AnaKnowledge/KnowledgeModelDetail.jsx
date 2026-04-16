// src/views/AnaKnowledge/KnowledgeModelDetail.jsx
import React, { useState, useEffect } from 'react';
import styles from './AnaKnowledgeView.module.css';
import { useAnaKnowledge } from '../../hooks/useAnaKnowledge';
import { BsArrowLeft, BsPlus, BsFilePdf, BsTrash, BsFilePdfFill, BsMagic, BsPencilSquare } from 'react-icons/bs';
import PdfImportModal from './PdfImportModal';
import './AnaKnowledgeView.premium.css';

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
        
        if (data.keywords) {
            data.keywords = data.keywords.split(',').map(k => k.trim()).filter(k => k);
        }

        if (editingEntry?.id) data.id = editingEntry.id;

        const res = await saveEntry(model.id, data);
        if (res.success) {
            setShowModal(false);
            setEditingEntry(null);
        } else {
            alert('Erro ao salvar: ' + res.error);
        }
    };

    const handleOpenModal = (entry = null) => {
        setEditingEntry(entry);
        setShowModal(true);
    };

    return (
        <div className="highTechContainer">
            <div className="dashboardHeader" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button 
                    onClick={onBack}
                    style={{ background: 'none', border: 'none', color: 'var(--ios-primary)', cursor: 'pointer', padding: 0 }}
                >
                    <BsArrowLeft size={24} />
                </button>
                <div>
                    <h2 className="glowTitle">{model.name}</h2>
                    <p className="dashboardSubtitle">{entries.length} blocos de dados</p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
                <button className="iosBtn iosBtnSecondary" style={{ flex: 1, fontSize: '0.85rem' }} onClick={() => setShowPdfModal(true)}>
                    <BsFilePdf /> PDF
                </button>
                <button className="iosBtn iosBtnPrimary" style={{ flex: 1, fontSize: '0.85rem' }} onClick={() => handleOpenModal()}>
                    <BsPlus /> Novo Bloco
                </button>
            </div>

            <div className="anaGrid">
                {entries.length === 0 && !isLoading && (
                    <div className="immersiveWizard">
                        <div className="wizardIconContainer"><BsMagic /></div>
                        <h2 className="wizardTitleLarge">Base Vazia</h2>
                        <p style={{ color: 'var(--ios-text-secondary)', fontSize: '0.9rem', textAlign: 'center' }}>
                            Alimente este modelo com PDFs ou cadastro manual.
                        </p>
                        
                        <div className="wizardGridLarge">
                            <div className="wizardChoiceCard" onClick={() => setShowPdfModal(true)}>
                                <BsFilePdfFill className="wizardChoiceIcon" />
                                <div>
                                    <h3 className="wizardCardTitle">Extrair de PDF</h3>
                                    <p className="wizardCardDesc">Leitura automática de documentos</p>
                                </div>
                            </div>
                            
                            <div className="wizardChoiceCard" onClick={() => handleOpenModal()}>
                                <BsPencilSquare className="wizardChoiceIcon" />
                                <div>
                                    <h3 className="wizardCardTitle">Manual</h3>
                                    <p className="wizardCardDesc">Cadastro direto de conhecimento</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {entries.map(entry => (
                    <div key={entry.id} className="anaCard" onClick={() => handleOpenModal(entry)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                                <h4 className="instructionTitle" style={{ margin: 0 }}>{entry.title}</h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                                    {entry.keywords?.map((k, i) => (
                                        <span key={i} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: 'var(--ios-text-secondary)' }}>
                                            #{k}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <button 
                                className={styles.deleteBtn}
                                onClick={(e) => { e.stopPropagation(); if(window.confirm('Deletar?')) deleteEntry(entry.id, model.id); }}
                            >
                                <BsTrash />
                            </button>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--ios-text-secondary)', marginTop: '12px', lineHeight: 1.4 }}>{entry.content}</p>
                    </div>
                ))}
            </div>

            {showModal && (
                <>
                    <div className="iosOverlay" onClick={() => setShowModal(false)} />
                    <div className="iosModal">
                        <h3 style={{ marginBottom: '20px', fontWeight: 700 }}>Bloco de Conhecimento</h3>
                        <form onSubmit={handleSave}>
                            <div className="iosFormGroup">
                                <label style={{ display: 'block', fontSize: '0.8rem', color: '#8e8e93', marginBottom: '8px' }}>Título</label>
                                <input name="title" className="iosInput" defaultValue={editingEntry?.title} required />
                            </div>
                            <div className="iosFormGroup">
                                <label style={{ display: 'block', fontSize: '0.8rem', color: '#8e8e93', marginBottom: '8px' }}>Keywords (vírgula)</label>
                                <input 
                                    name="keywords" 
                                    className="iosInput" 
                                    defaultValue={editingEntry?.keywords?.join(', ')} 
                                    placeholder="ex: salário, home office"
                                />
                            </div>
                            <div className="iosFormGroup">
                                <label style={{ display: 'block', fontSize: '0.8rem', color: '#8e8e93', marginBottom: '8px' }}>Conteúdo</label>
                                <textarea name="content" className="iosTextarea" style={{ height: '180px' }} defaultValue={editingEntry?.content} required />
                            </div>

                            <div className="iosActionButtons">
                                <button type="button" className="iosBtn iosBtnSecondary" onClick={() => setShowModal(false)}>
                                    Fechar
                                </button>
                                <button type="submit" className="iosBtn iosBtnPrimary" disabled={isLoading}>
                                    Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </>
            )}

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
