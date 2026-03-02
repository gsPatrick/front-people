import React, { useState, useEffect } from 'react';
import styles from './EditJobView.module.css';
import Header from '../../components/Header/Header';
import CustomFieldsForm from '../../components/Modals/CustomFieldsForm';

const FIELD_CATEGORIES = {
    vaga: ['titulo', 'nome', 'area', 'departamento', 'status', 'descricao', 'sumario', 'equipe', 'senioridade', 'tags', 'salario', 'faixa', 'localizacao', 'modelo', 'contratacao', 'tipo', 'apresentacao'],
    requisitos: ['requisito', 'qualificacao', 'competencia', 'idioma', 'escolaridade', 'formacao', 'tecnico', 'comportamental', 'conhecimento', 'experiencia', 'graduacao', 'ferramenta', 'cargo', 'palavra-chave'],
    interno: ['gestor', 'unidade', 'sla', 'prioridade', 'autorizacao', 'centro de custo', 'headcount', 'budgets', 'prazo', 'vaga_id', 'motivo', 'aprovador', 'solicitante', 'banda', 'justificativa', 'parcela', 'kick-off', 'consultor', 'dono', 'pesquisador', 'fup', 'setor', 'cidade', 'estado', 'mapeamento', 'feedback'],
    beneficios: ['beneficio', 'vibe', 'alimentacao', 'saude', 'odontologico', 'seguro', 'gympass', 'auxilio', 'vale', 'transporte', 'vr', 'va', 'vt', 'bonus', 'plr'],
    avaliacao: ['scorecard', 'kit', 'entrevista', 'avaliacao', 'teste', 'prova']
};

const getCategoryForField = (fieldName) => {
    if (!fieldName) return 'outros';
    const name = fieldName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    if (FIELD_CATEGORIES.vaga.some(k => name.includes(k))) return 'vaga';
    if (FIELD_CATEGORIES.requisitos.some(k => name.includes(k))) return 'requisitos';
    if (FIELD_CATEGORIES.interno.some(k => name.includes(k))) return 'interno';
    if (FIELD_CATEGORIES.beneficios.some(k => name.includes(k))) return 'beneficios';
    if (FIELD_CATEGORIES.avaliacao.some(k => name.includes(k))) return 'avaliacao';
    return 'outros';
};

const CategoryFields = ({ category, customFields, formData, handleCustomFieldChange, standardFields = null }) => {
    const filteredCustomFields = (customFields || []).filter(f => getCategoryForField(f.name) === category);
    
    return (
        <div className={styles.categoryContent}>
            {standardFields}
            {filteredCustomFields.length > 0 && (
                <CustomFieldsForm 
                    fields={filteredCustomFields}
                    formData={formData}
                    handleChange={handleCustomFieldChange} 
                />
            )}
            {(!standardFields && filteredCustomFields.length === 0) && (
                <p className={styles.emptyState}>Nenhum campo específico para esta seção.</p>
            )}
        </div>
    );
};

const EditJobView = ({ 
    job, 
    onSave, 
    onCancel,
    jobCustomFields = [],
    areas = [],
    scorecards // Added scorecards prop
}) => {
    const [activeTab, setActiveTab] = useState('vaga'); 
    const [formData, setFormData] = useState({
        name: job?.name || '',
        description: job?.description || '',
        areaId: job?.areaId || '',
        status: job?.status || 'open',
        slaDaysGoal: job?.slaDaysGoal || 30,
        syncNow: false,
        scorecardId: job?.scorecardId || job?.data?.scorecardId || '', // Added scorecardId
        interviewKitId: job?.interviewKitId || job?.data?.interviewKitId || '' // Added interviewKitId
    });
    const [customFormData, setCustomFormData] = useState({});

    useEffect(() => {
        if (job) {
            setFormData({
                name: job.name || job.title || '',
                description: job.description || '',
                areaId: job.areaId || (job.area?.id) || '',
                status: job.status || 'open',
                slaDaysGoal: job.slaDaysGoal || 30,
                syncNow: false,
                scorecardId: job.scorecardId || job.data?.scorecardId || ''
            });

            const initialCustomFields = {};
            jobCustomFields.forEach(field => {
                initialCustomFields[field.id || field.customFieldId] = field.value;
            });
            setCustomFormData(initialCustomFields);
        }
    }, [job, jobCustomFields]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleCustomFieldChange = (e) => {
        const { name, value, type, checked } = e.target;
        setCustomFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSave = () => {
        if (!formData.name || !formData.description || !formData.areaId) {
            alert('Existem dados obrigatórios que faltam ser preenchidos.');
            return;
        }

        const payload = { 
            ...formData,
            customFields: jobCustomFields.map(f => ({
                id: f.id || f.customFieldId,
                name: f.name,
                value: customFormData[f.id || f.customFieldId]
            }))
        };
        
        // Se selecionou uma área, garante que o nome também vá no data para exibição offline rápida
        if (formData.areaId) {
            const selectedArea = areas.find(a => a.id === formData.areaId);
            if (selectedArea) {
                payload.areaName = selectedArea.name;
            }
        }

        onSave(job?.id, payload);
    };

    return (
        <div className={styles.container}>
            <Header
                title={job ? "Editar Vaga" : "Nova Vaga"}
                subtitle={job ? `Modificando ${job.name}` : "Crie uma nova vaga unificada"}
                onBack={onCancel}
            />
            
            <div className={styles.tabs}>
                <button className={`${styles.tabButton} ${activeTab === 'vaga' ? styles.active : ''}`} onClick={() => setActiveTab('vaga')}>Dados da Vaga</button>
                <button className={`${styles.tabButton} ${activeTab === 'requisitos' ? styles.active : ''}`} onClick={() => setActiveTab('requisitos')}>Requisitos</button>
                <button className={`${styles.tabButton} ${activeTab === 'interno' ? styles.active : ''}`} onClick={() => setActiveTab('interno')}>Informações Internas</button>
                <button className={`${styles.tabButton} ${activeTab === 'beneficios' ? styles.active : ''}`} onClick={() => setActiveTab('beneficios')}>Benefícios</button>
                <button className={`${styles.tabButton} ${activeTab === 'avaliacao' ? styles.active : ''}`} onClick={() => setActiveTab('avaliacao')}>Avaliação</button>
                <button className={`${styles.tabButton} ${activeTab === 'outros' ? styles.active : ''}`} onClick={() => setActiveTab('outros')}>Outros</button>
            </div>
            
            <main className={styles.scrollableArea}>
                {activeTab === 'vaga' && (
                    <CategoryFields 
                        category="vaga"
                        customFields={jobCustomFields}
                        formData={customFormData}
                        handleCustomFieldChange={handleCustomFieldChange}
                        standardFields={
                            <>
                                <div className={styles.inputRow}>
                                    <div className={styles.inputGroup}>
                                        <label>Título da Vaga *</label>
                                        <input type="text" name="name" value={formData.name || ''} onChange={handleChange} required placeholder="Ex: Desenvolvedor Senior" />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label>Tags</label>
                                        <input type="text" name="tags" placeholder="Separe por vírgulas..." />
                                    </div>
                                </div>
                                <div className={styles.inputRow}>
                                    <div className={styles.inputGroup}>
                                        <label>Status</label>
                                        <select name="status" value={formData.status || 'open'} onChange={handleChange}>
                                            <option value="open">Aberta</option>
                                            <option value="paused">Congelada (Pausada)</option>
                                            <option value="closed">Fechada</option>
                                            <option value="canceled">Cancelada</option>
                                        </select>
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label>Área / Departamento *</label>
                                        <select name="areaId" value={formData.areaId || ''} onChange={handleChange} required>
                                            <option value="">Selecione uma área...</option>
                                            {(areas || []).map(area => (
                                                <option key={area.id} value={area.id}>{area.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {!job && (
                                    <div className={styles.syncToggleRow} style={{ marginTop: '16px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <input 
                                            type="checkbox" 
                                            id="syncNow" 
                                            name="syncNow" 
                                            checked={formData.syncNow} 
                                            onChange={handleChange}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                        <label htmlFor="syncNow" style={{ cursor: 'pointer', fontWeight: '500', color: 'var(--accent-primary)' }}>
                                            Sincronizar com InHire imediatamente após criar
                                        </label>
                                    </div>
                                )}
                                <div className={styles.inputGroup}>
                                    <label>Descrição / Sumário</label>
                                    <textarea name="description" value={formData.description || ''} onChange={handleChange} rows={8} placeholder="Descreva os objetivos da vaga..." />
                                </div>
                            </>
                        }
                    />
                )}

                {activeTab === 'requisitos' && (
                    <CategoryFields 
                        category="requisitos"
                        customFields={jobCustomFields}
                        formData={customFormData}
                        handleCustomFieldChange={handleCustomFieldChange}
                    />
                )}

                {activeTab === 'interno' && (
                    <CategoryFields 
                        category="interno"
                        customFields={jobCustomFields}
                        formData={customFormData}
                        handleCustomFieldChange={handleCustomFieldChange}
                        standardFields={
                            <div className={styles.inputGroup}>
                                <label>Meta de SLA (dias)</label>
                                <input type="number" name="slaDaysGoal" value={formData.slaDaysGoal || 30} onChange={handleChange} min={1} />
                            </div>
                        }
                    />
                )}

                {activeTab === 'beneficios' && (
                    <CategoryFields 
                        category="beneficios"
                        customFields={jobCustomFields}
                        formData={customFormData}
                        handleCustomFieldChange={handleCustomFieldChange}
                    />
                )}
                
                {activeTab === 'avaliacao' && (
                    <CategoryFields 
                        category="avaliacao"
                        customFields={jobCustomFields}
                        formData={customFormData}
                        handleCustomFieldChange={handleCustomFieldChange}
                        standardFields={
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <div className={styles.formGroup}>
                                    <label>Scorecard Padrão</label>
                                    <select 
                                        value={formData.scorecardId}
                                        onChange={(e) => setFormData(prev => ({ ...prev, scorecardId: e.target.value }))}
                                    >
                                        <option value="">Selecione um Scorecard</option>
                                        {(scorecards || []).map(sc => (
                                            <option key={sc.id} value={sc.id}>{sc.title || sc.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Kit de Entrevista Padrão</label>
                                    <select 
                                        value={formData.interviewKitId}
                                        onChange={(e) => setFormData(prev => ({ ...prev, interviewKitId: e.target.value }))}
                                    >
                                        <option value="">Selecione um Kit (Caso disponível)</option>
                                        {/* Kits costumam ser específicos por vaga, mas podemos permitir selecionar se houver uma lista global */}
                                    </select>
                                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Nota: O kit define as perguntas e pesos para a análise de IA.</p>
                                </div>
                            </div>
                        }
                    />
                )}

                {activeTab === 'outros' && (
                    <CategoryFields 
                        category="outros"
                        customFields={jobCustomFields}
                        formData={customFormData}
                        handleCustomFieldChange={handleCustomFieldChange}
                    />
                )}
            </main>

            <footer className={styles.footer}>
                <button onClick={onCancel} className={styles.cancelButton}>Cancelar</button>
                <button onClick={handleSave} className={styles.saveButton}>{job ? 'Salvar Alterações' : 'Criar Vaga'}</button>
            </footer>
        </div>
    );
};

export default EditJobView;
