import React, { useState, useEffect } from 'react';
import styles from './AIMemoryView.module.css';
import Header from '../../components/Header/Header';
import { BsPlus, BsPencil, BsTrash, BsLightbulb } from 'react-icons/bs';
import * as api from '../../services/api.service';

const AIMemoryView = ({ isEmbedded = false }) => {
    const [memories, setMemories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMemory, setEditingMemory] = useState(null);
    const [formData, setFormData] = useState({ term: '', definition: '' });

    // Carregar memórias
    useEffect(() => {
        loadMemories();
    }, []);

    const loadMemories = async () => {
        setLoading(true);
        const data = await api.getAIMemories();
        if (data) setMemories(data);
        setLoading(false);
    };

    // Handlers
    const handleOpenCreate = () => {
        setEditingMemory(null);
        setFormData({ term: '', definition: '' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (memory) => {
        setEditingMemory(memory);
        setFormData({ term: memory.term, definition: memory.definition });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja remover este termo da memória da IA?')) {
            const success = await api.deleteAIMemory(id);
            if (success) loadMemories();
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingMemory) {
                await api.updateAIMemory(editingMemory.id, formData);
            } else {
                await api.createAIMemory(formData);
            }
            setIsModalOpen(false);
            loadMemories();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar.');
        }
    };

    const containerStyle = isEmbedded ? { minHeight: 'auto', padding: '0.5rem' } : {};

    return (
        <div className={styles.container} style={containerStyle}>
            {!isEmbedded && (
                <Header title="Memória da IA" subtitle="Ensine termos específicos para a IA" backRoute="settings" />
            )}

            <div className={styles.content}>
                <div className={styles.introText}>
                    <BsLightbulb style={{ marginRight: '8px', color: '#ffd700' }} />
                    Defina termos exclusivos da sua empresa ou mercado (ex: "UAU", "Fit Proativo").
                    A IA usará essas definições para avaliar os candidatos com mais precisão.
                </div>

                <div className={styles.memoryList}>
                    {loading ? (
                        <p style={{ textAlign: 'center', color: '#666' }}>Carregando...</p>
                    ) : memories.length === 0 ? (
                        <div className={styles.emptyState}>
                            Nenhum termo definido ainda. Adicione o primeiro!
                        </div>
                    ) : (
                        memories.map(memory => (
                            <div key={memory.id} className={styles.memoryCard}>
                                <div className={styles.cardHeader}>
                                    <span className={styles.term}>{memory.term}</span>
                                    <div className={styles.actions}>
                                        <button onClick={() => handleOpenEdit(memory)} className={styles.actionButton}>
                                            <BsPencil />
                                        </button>
                                        <button onClick={() => handleDelete(memory.id)} className={`${styles.actionButton} ${styles.deleteButton}`}>
                                            <BsTrash />
                                        </button>
                                    </div>
                                </div>
                                <p className={styles.definition}>{memory.definition}</p>
                            </div>
                        ))
                    )}
                </div>

                <button onClick={handleOpenCreate} className={styles.addButton}>
                    <BsPlus size={20} /> Adicionar Novo Termo
                </button>
            </div>

            {/* Modal de Criação/Edição */}
            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h3 className={styles.modalTitle}>
                            {editingMemory ? 'Editar Termo' : 'Novo Termo'}
                        </h3>
                        <form onSubmit={handleSave}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Termo (ex: UAU)</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={formData.term}
                                    onChange={e => setFormData({ ...formData, term: e.target.value })}
                                    required
                                    placeholder="Digite o nome do termo..."
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Definição para a IA</label>
                                <textarea
                                    className={styles.textarea}
                                    value={formData.definition}
                                    onChange={e => setFormData({ ...formData, definition: e.target.value })}
                                    required
                                    placeholder="Explique para a IA o que este termo significa e como deve ser avaliado..."
                                />
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" onClick={() => setIsModalOpen(false)} className={styles.cancelButton}>
                                    Cancelar
                                </button>
                                <button type="submit" className={styles.saveButton}>
                                    Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIMemoryView;
