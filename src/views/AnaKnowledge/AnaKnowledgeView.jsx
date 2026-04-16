// src/views/AnaKnowledge/AnaKnowledgeView.jsx
import React, { useState, useEffect } from 'react';
import styles from './AnaKnowledgeView.module.css';
import { useAnaKnowledge } from '../../hooks/useAnaKnowledge';
import Header from '../../components/Header/Header';
import { BsPlus, BsBook, BsShieldLock, BsTrash, BsPencil, BsGearFill, BsLightbulbFill, BsMagic, BsPencilSquare, BsFilePdfFill, BsLinkedin } from 'react-icons/bs';
import KnowledgeModelDetail from './KnowledgeModelDetail';
import './AnaKnowledgeView.premium.css'; // Novo CSS Premium

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
        <div className="highTechContainer">
            {!isEmbedded && <Header title="Inteligência" subtitle="Configurações da Ana" />}

            <div className="dashboardHeader">
                <h1 className="glowTitle">Centro de Comando</h1>
                <p className="dashboardSubtitle">Gestão de Inteligência</p>
                
                <div className="premiumTabs">
                    <button 
                        className={`premiumTab ${activeTab === 'rules' ? 'active' : ''}`}
                        onClick={() => setActiveTab('rules')}
                    >
                        <BsShieldLock size={18} /> Mestra
                    </button>
                    <button 
                        className={`premiumTab ${activeTab === 'models' ? 'active' : ''}`}
                        onClick={() => setActiveTab('models')}
                    >
                        <BsBook size={18} /> Especialista
                    </button>
                </div>
            </div>

            <section className={styles.content}>
                {isLoading ? (
                    <div className={styles.loader}>Acessando Núcleo...</div>
                ) : ((activeTab === 'rules' && rules.length === 0) || (activeTab === 'models' && models.length === 0)) ? (
                    <div className="immersiveWizard">
                        <div className="wizardIconContainer">
                            {activeTab === 'rules' ? <BsShieldLock /> : <BsGearFill />}
                        </div>
                        <h2 className="wizardTitleLarge">Inicie a Inteligência</h2>
                        <p style={{ color: 'var(--ios-text-secondary)', fontSize: '0.9rem' }}>
                            Configure as bases para que a Ana saiba como operar.
                        </p>
                        
                        <div className="wizardGridLarge">
                            <div className="wizardChoiceCard" onClick={() => handleOpenModal()}>
                                <BsPencilSquare className="wizardChoiceIcon" />
                                <div>
                                    <h3 className="wizardCardTitle">Manual</h3>
                                    <p className="wizardCardDesc">Configuração detalhada</p>
                                </div>
                            </div>
                            
                            {activeTab === 'models' && (
                                <div className="wizardChoiceCard" onClick={() => handleOpenModal()}>
                                    <BsFilePdfFill className="wizardChoiceIcon" />
                                    <div>
                                        <h3 className="wizardCardTitle">Importar PDF</h3>
                                        <p className="wizardCardDesc">Extração automática</p>
                                    </div>
                                </div>
                            )}

                            <div className="wizardChoiceCard" onClick={() => alert('Integração em breve')}>
                                <BsLinkedin className="wizardChoiceIcon" style={{ color: '#0077b5' }} />
                                <div>
                                    <h3 className="wizardCardTitle">LinkedIn</h3>
                                    <p className="wizardCardDesc">Sincronização de perfis</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="anaGrid">
                            {activeTab === 'rules' ? (
                                rules.map(rule => (
                                    <div key={rule.id} className="anaCard" onClick={() => handleOpenModal(rule)}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <BsLightbulbFill style={{ color: 'var(--ios-primary)' }} />
                                                <h3 className="instructionTitle" style={{ margin: 0 }}>{rule.title}</h3>
                                            </div>
                                            <button 
                                                className={styles.deleteBtn} 
                                                onClick={(e) => { e.stopPropagation(); if(window.confirm('Excluir?')) deleteRule(rule.id); }}
                                            >
                                                <BsTrash />
                                            </button>
                                        </div>
                                        <div className="masterInstruction">{rule.content}</div>
                                        <div style={{ marginTop: '12px', fontSize: '0.7rem' }}>
                                            <span className="instructionBadge">Prioridade {rule.priority}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                models.map(model => (
                                    <div key={model.id} className="anaCard" onClick={() => setSelectedModel(model)}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <h3 className="instructionTitle" style={{ margin: 0 }}>{model.name}</h3>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--ios-text-secondary)', margin: '4px 0 0 0' }}>{model.id.substring(0,8)}</p>
                                            </div>
                                            <button 
                                                className={styles.deleteBtn} 
                                                onClick={(e) => { e.stopPropagation(); if(window.confirm('Excluir?')) deleteModel(model.id); }}
                                            >
                                                <BsTrash />
                                            </button>
                                        </div>
                                        <div className="cardFooter">
                                            <span className="manageLink">Gerenciar Core</span>
                                            <span style={{ fontSize: '0.7rem', color: model.isActive ? '#34c759' : '#ff3b30', fontWeight: 600 }}>
                                                {model.isActive ? 'ONLINE' : 'OFFLINE'}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <button className="premiumAddBtn" onClick={() => handleOpenModal()}>
                            <BsPlus size={24} /> {activeTab === 'rules' ? 'Nova Regra' : 'Nova Especialidade'}
                        </button>
                    </>
                )}
            </section>

            {showModal && (
                <>
                    <div className="iosOverlay" onClick={() => setShowModal(false)} />
                    <div className="iosModal">
                        <h3 style={{ marginBottom: '20px', fontWeight: 700 }}>{editingItem ? 'Editar' : 'Adicionar'}</h3>
                        <form onSubmit={handleSave}>
                            <div className="iosFormGroup">
                                <label style={{ display: 'block', fontSize: '0.8rem', color: '#8e8e93', marginBottom: '8px' }}>Nome / Título</label>
                                <input 
                                    name={activeTab === 'rules' ? 'title' : 'name'} 
                                    className="iosInput" 
                                    defaultValue={editingItem?.title || editingItem?.name} 
                                    placeholder="Ex: Resumo de Perfil"
                                    required 
                                />
                            </div>
                            
                            {activeTab === 'rules' ? (
                                <>
                                    <div className="iosFormGroup">
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#8e8e93', marginBottom: '8px' }}>Diretriz</label>
                                        <textarea 
                                            name="content" 
                                            className="iosTextarea" 
                                            defaultValue={editingItem?.content} 
                                            placeholder="Descreva a regra..."
                                            required 
                                        />
                                    </div>
                                    <div className="iosFormGroup">
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#8e8e93', marginBottom: '8px' }}>Prioridade (0-10)</label>
                                        <input 
                                            type="number" 
                                            name="priority" 
                                            className="iosInput" 
                                            defaultValue={editingItem?.priority || 0} 
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="iosFormGroup">
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#8e8e93', marginBottom: '8px' }}>Contexto</label>
                                    <textarea 
                                        name="description" 
                                        className="iosTextarea" 
                                        defaultValue={editingItem?.description} 
                                        placeholder="Sobre o que é este modelo..."
                                    />
                                </div>
                            )}

                            <div className="iosActionButtons">
                                <button type="button" className="iosBtn iosBtnSecondary" onClick={() => setShowModal(false)}>
                                    Fechar
                                </button>
                                <button type="submit" className="iosBtn iosBtnPrimary" disabled={isLoading}>
                                    {isLoading ? '...' : 'Salvar'}
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
