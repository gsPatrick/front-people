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
        loadModels, saveModel, deleteModel,
        extractPdfToBlocks // Importado para uso no Wizard global
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
            {!isEmbedded && <Header title="Inteligência Artificial" subtitle="Controle as diretrizes e conhecimentos da Ana" />}

            <div className="dashboardHeader">
                <div>
                    <h1 className="glowTitle">Centro de Comando</h1>
                    <p style={{ margin: '8px 0 0 0', color: '#8892b0' }}>Gestão de Inteligência Sistêmica</p>
                </div>
                
                <div className="premiumTabs">
                    <div 
                        className={`premiumTab ${activeTab === 'rules' ? 'active' : ''}`}
                        onClick={() => setActiveTab('rules')}
                    >
                        <BsShieldLock size={20} /> Instruções Mestras
                    </div>
                    <div 
                        className={`premiumTab ${activeTab === 'models' ? 'active' : ''}`}
                        onClick={() => setActiveTab('models')}
                    >
                        <BsBook size={20} /> Especialidades
                    </div>
                </div>
            </div>

            <section className={styles.content}>
                {/* WIZARD IMERSIVO QUANDO VAZIO */}
                {((activeTab === 'rules' && rules.length === 0) || (activeTab === 'models' && models.length === 0)) && !isLoading && (
                    <div className="immersiveWizard">
                        <div className="wizardIconContainer">
                            {activeTab === 'rules' ? <BsShieldLock /> : <BsMagic />}
                        </div>
                        <h2 className="wizardTitleLarge">O Núcleo de Conhecimento está vazio</h2>
                        <p style={{ fontSize: '1.2rem', color: '#8892b0', maxWidth: '600px', textAlign: 'center' }}>
                            {activeTab === 'rules' 
                                ? 'A Ana precisa de diretrizes de ouro para saber como agir. Defina as regras de comportamento agora.' 
                                : 'Crie modelos de especialidade para que a Ana domine assuntos técnicos específicos via RAG.'}
                        </p>
                        
                        <div className="wizardGridLarge">
                            <div className="wizardChoiceCard" onClick={() => handleOpenModal()}>
                                <div className="wizardChoiceIcon"><BsPencilSquare /></div>
                                <h3 className="wizardCardTitle">Configuração Manual</h3>
                                <p className="wizardCardDesc">Defina cada detalhe manualmente para controle total.</p>
                            </div>
                            
                            {activeTab === 'models' && (
                                <div className="wizardChoiceCard" style={{ borderColor: 'var(--ana-primary)' }} onClick={() => handleOpenModal()}>
                                    <div className="wizardChoiceIcon"><BsFilePdfFill /></div>
                                    <h3 className="wizardCardTitle">Extração Via PDF</h3>
                                    <p className="wizardCardDesc">Deixe a IA ler seus documentos e extrair o conhecimento para você.</p>
                                </div>
                            )}

                            <div className="wizardChoiceCard" onClick={() => { alert('Funcionalidade em desenvolvimento'); }}>
                                <div className="wizardChoiceIcon" style={{ color: '#0077b5' }}><BsLinkedin /></div>
                                <h3 className="wizardCardTitle">Sincronizar LinkedIn</h3>
                                <p className="wizardCardDesc">Puxe dados de perfis públicos para treinar a inteligência.</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className={activeTab === 'rules' ? styles.rulesGrid : 'anaGrid'}>
                    {activeTab === 'rules' ? (
                        rules.map(rule => (
                            <div key={rule.id} className="anaCard" onClick={() => handleOpenModal(rule)}>
                                <div className="instructionHeader">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ padding: '8px', background: 'rgba(0, 210, 255, 0.1)', borderRadius: '8px' }}>
                                            <BsLightbulbFill style={{ color: 'var(--ana-primary)' }} />
                                        </div>
                                        <h3 className="instructionTitle">{rule.title}</h3>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span className="instructionBadge">PRIORITY_LVL_{rule.priority}</span>
                                        <button 
                                            className={styles.deleteBtn} 
                                            onClick={(e) => { e.stopPropagation(); if(window.confirm('Excluir regra sistêmica?')) deleteRule(rule.id); }}
                                        >
                                            <BsTrash />
                                        </button>
                                    </div>
                                </div>
                                <div className="masterInstruction">
                                    {rule.content}
                                </div>
                            </div>
                        ))
                    ) : (
                        models.map(model => (
                            <div key={model.id} className="anaCard" onClick={() => setSelectedModel(model)}>
                                <div className={styles.cardHeader}>
                                    <div>
                                        <h3 className={styles.cardTitle}>{model.name}</h3>
                                        <p className={styles.cardDate}>DATABASE_ID: {model.id.substring(0,8)}</p>
                                    </div>
                                    <div className={styles.cardActions}>
                                        <button 
                                            className={styles.deleteBtn} 
                                            onClick={(e) => { e.stopPropagation(); if(window.confirm('Excluir base de conhecimento?')) deleteModel(model.id); }}
                                        >
                                            <BsTrash />
                                        </button>
                                    </div>
                                </div>
                                <p className={styles.cardDesc}>{model.description || 'Nenhum contexto descritivo disponível.'}</p>
                                <div className={styles.cardFooter}>
                                    <span className="manageLink">EXECUTAR_HUB →</span>
                                    <span className={styles.badge} style={{ background: model.isActive ? 'rgba(82, 196, 26, 0.1)' : 'rgba(255, 77, 79, 0.1)', color: model.isActive ? '#52c41a' : '#ff4d4f' }}>
                                        {model.isActive ? 'ONLINE' : 'OFFLINE'}
                                    </span>
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
