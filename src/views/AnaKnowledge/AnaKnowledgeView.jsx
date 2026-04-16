// src/views/AnaKnowledge/AnaKnowledgeView.jsx
import React, { useState, useEffect } from 'react';
import styles from './AnaKnowledgeView.module.css';
import { useAnaKnowledge } from '../../hooks/useAnaKnowledge';
import Header from '../../components/Header/Header';
import { BsPlus, BsBook, BsShieldLock, BsTrash, BsPencil } from 'react-icons/bs';
import KnowledgeModelDetail from './KnowledgeModelDetail';

const AnaKnowledgeView = ({ isEmbedded = false }) => {
    const { 
        rules, models, isLoading, 
        loadRules, saveRule, deleteRule,
        loadModels, saveModel, deleteModel 
    } = useAnaKnowledge();

    const [activeTab, setActiveTab] = useState('rules');
    const [selectedModel, setSelectedModel] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    useEffect(() => {
        loadRules();
        loadModels();
    }, [loadRules, loadModels]);

    const handleOpenModal = (item = null) => {
        setEditingItem(item);
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        if (editingItem?.id) data.id = editingItem.id;

        const res = activeTab === 'rules' ? await saveRule(data) : await saveModel(data);
        if (res.success) {
            setShowModal(false);
            setEditingItem(null);
        } else {
            alert('Erro ao salvar: ' + res.error);
        }
    };

    if (selectedModel) {
        return <KnowledgeModelDetail model={selectedModel} onBack={() => { setSelectedModel(null); loadModels(); }} />;
    }

    return (
        <div className={styles.container}>
            {!isEmbedded && <Header title="Inteligência da Ana" subtitle="Configure as regras e o conhecimento especializado" />}

            <div className={styles.tabs}>
                <div 
                    className={`${styles.tab} ${activeTab === 'rules' ? styles.active : ''}`}
                    onClick={() => setActiveTab('rules')}
                >
                    <BsShieldLock /> Regras de Ouro
                </div>
                <div 
                    className={`${styles.tab} ${activeTab === 'models' ? styles.active : ''}`}
                    onClick={() => setActiveTab('models')}
                >
                    <BsBook /> Modelos de Conhecimento
                </div>
            </div>

            <section className={styles.content}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.title}>
                        {activeTab === 'rules' ? 'Regras de Ouro' : 'Modelos de Conhecimento'}
                    </h2>
                    <button className={styles.addBtn} onClick={() => handleOpenModal()}>
                        <BsPlus /> {activeTab === 'rules' ? 'Nova Regra' : 'Novo Modelo'}
                    </button>
                </div>

                <div className={styles.grid}>
                    {activeTab === 'rules' ? (
                        rules.map(rule => (
                            <div key={rule.id} className={styles.card} onClick={() => handleOpenModal(rule)}>
                                <div className={styles.cardHeader}>
                                    <div>
                                        <h3 className={styles.cardTitle}>{rule.title}</h3>
                                        <div className={styles.badge}>Prioridade {rule.priority}</div>
                                    </div>
                                    <button 
                                        className={styles.deleteBtn} 
                                        onClick={(e) => { e.stopPropagation(); deleteRule(rule.id); }}
                                    >
                                        <BsTrash />
                                    </button>
                                </div>
                                <p className={styles.cardDesc}>{rule.content}</p>
                            </div>
                        ))
                    ) : (
                        models.map(model => (
                            <div key={model.id} className={styles.card} onClick={() => setSelectedModel(model)}>
                                <div className={styles.cardHeader}>
                                    <div>
                                        <h3 className={styles.cardTitle}>{model.name}</h3>
                                    </div>
                                    <div className={styles.cardActions}>
                                        <button 
                                            className={styles.deleteBtn} 
                                            onClick={(e) => { e.stopPropagation(); deleteModel(model.id); }}
                                        >
                                            <BsTrash />
                                        </button>
                                    </div>
                                </div>
                                <p className={styles.cardDesc}>{model.description || 'Sem descrição'}</p>
                                <div className={styles.cardFooter}>
                                    <span>Clique para gerenciar entradas</span>
                                    <span className={styles.badge}>{model.isActive ? 'Ativo' : 'Inativo'}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* MODAL PARA REGRAS / MODELOS */}
            {showModal && (
                <>
                    <div className={styles.overlay} onClick={() => setShowModal(false)} />
                    <div className={styles.modal}>
                        <h3>{editingItem ? 'Editar' : 'Criar'} {activeTab === 'rules' ? 'Regra' : 'Modelo'}</h3>
                        <form onSubmit={handleSave}>
                            <div className={styles.formField}>
                                <label className={styles.label}>{activeTab === 'rules' ? 'Título' : 'Nome do Modelo'}</label>
                                <input 
                                    name={activeTab === 'rules' ? 'title' : 'name'} 
                                    className={styles.input} 
                                    defaultValue={editingItem?.title || editingItem?.name} 
                                    required 
                                />
                            </div>
                            
                            {activeTab === 'rules' ? (
                                <>
                                    <div className={styles.formField}>
                                        <label className={styles.label}>Conteúdo da Regra</label>
                                        <textarea 
                                            name="content" 
                                            className={styles.textarea} 
                                            defaultValue={editingItem?.content} 
                                            required 
                                        />
                                    </div>
                                    <div className={styles.formField}>
                                        <label className={styles.label}>Prioridade (número alto = mais importante)</label>
                                        <input 
                                            type="number" 
                                            name="priority" 
                                            className={styles.input} 
                                            defaultValue={editingItem?.priority || 0} 
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className={styles.formField}>
                                    <label className={styles.label}>Descrição</label>
                                    <textarea 
                                        name="description" 
                                        className={styles.textarea} 
                                        defaultValue={editingItem?.description} 
                                    />
                                </div>
                            )}

                            <div className={styles.formActions}>
                                <button type="button" className={styles.cancelBtn} onClick={() => setShowModal(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className={styles.submitBtn} disabled={isLoading}>
                                    {isLoading ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
};

export default AnaKnowledgeView;
