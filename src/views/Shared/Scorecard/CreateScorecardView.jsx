// src/views/Shared/Scorecard/CreateScorecardView.jsx

import React, { useState } from 'react';
import styles from './CreateScorecardView.module.css';

const CreateScorecardView = ({ jobs, job: initialJob, application, onSubmit, onCancel }) => {
    const [categories, setCategories] = useState([{ name: '', skills: [{ name: '' }] }]);
    const [selectedJobId, setSelectedJobId] = useState(initialJob?.id || '');
    const [scorecardName, setScorecardName] = useState('');
    const [syncNow, setSyncNow] = useState(false);

    const handleCategoryChange = (index, value) => {
        const newCategories = [...categories];
        newCategories[index].name = value;
        setCategories(newCategories);
    };

    const handleSkillChange = (catIndex, skillIndex, value) => {
        const newCategories = [...categories];
        newCategories[catIndex].skills[skillIndex].name = value;
        setCategories(newCategories);
    };

    const addCategory = () => {
        setCategories([...categories, { name: '', skills: [{ name: '' }] }]);
    };

    const addSkill = (catIndex) => {
        const newCategories = [...categories];
        newCategories[catIndex].skills.push({ name: '' });
        setCategories(newCategories);
    };

    const handleSubmit = () => {
        const finalName = scorecardName || (application ? `Avaliação - ${application.stageName}` : 'Novo Scorecard');
        const jobId = selectedJobId;

        if (!jobId) {
            alert('Por favor, selecione uma vaga.');
            return;
        }

        if (!finalName) {
            alert('Por favor, dê um nome ao scorecard.');
            return;
        }

        if (categories.some(c => !c.name.trim() || c.skills.some(s => !s.name.trim()))) {
            alert('Por favor, preencha todos os nomes de categorias e critérios.');
            return;
        }

        const payload = {
            jobId: jobId,
            name: finalName,
            syncStatus: syncNow ? 'PENDING' : 'LOCAL',
            skillCategories: categories.map(c => ({
                name: c.name,
                skills: c.skills.map(s => ({ name: s.name }))
            }))
        };

        // Se for no contexto de uma candidatura, o fluxo pode ser "Criar e Avaliar"
        if (application) {
            payload.jobStageId = application.stageId;
        }
        
        onSubmit(payload);
    };

    return (
        <div className={styles.overlay} onClick={onCancel}>
            <div className={styles.content} onClick={(e) => e.stopPropagation()}>
                <header className={styles.header}>
                    <button onClick={onCancel} className={styles.backButton}>
                        ←
                    </button>
                    <div className={styles.titleContainer}>
                        <h2 className={styles.title}>{application ? 'Criar Scorecard para a Vaga' : 'Novo Modelo de Scorecard'}</h2>
                        {initialJob && <p className={styles.subtitle}>Para a vaga "{initialJob.name}"</p>}
                    </div>
                    <button onClick={onCancel} className={styles.closeButton}>×</button>
                </header>
                <main className={styles.main}>
                    <div className={styles.setupGroup}>
                        <div className={styles.inputGroup}>
                            <label>Nome do Scorecard</label>
                            <input 
                                type="text" 
                                placeholder="Ex: Avaliação Técnica Senior" 
                                value={scorecardName} 
                                onChange={(e) => setScorecardName(e.target.value)}
                                className={styles.nameInput}
                            />
                        </div>
                        
                        {!initialJob && jobs && (
                            <div className={styles.inputGroup}>
                                <label>Vaga Vinculada *</label>
                                <select 
                                    value={selectedJobId} 
                                    onChange={(e) => setSelectedJobId(e.target.value)}
                                    className={styles.jobSelect}
                                >
                                    <option value="">Selecione uma vaga...</option>
                                    {jobs.map(j => (
                                        <option key={j.id} value={j.id}>{j.name || j.title}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className={styles.syncOptionRow} style={{ marginTop: '12px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input 
                                type="checkbox" 
                                id="syncNow" 
                                checked={syncNow} 
                                onChange={(e) => setSyncNow(e.target.checked)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <label htmlFor="syncNow" style={{ cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: 'var(--accent-primary)' }}>
                                Sincronizar com InHire imediatamente após salvar
                            </label>
                        </div>
                    </div>

                    <p className={styles.sectionDivider}>Categorias e Critérios de Avaliação</p>
                    
                    {categories.map((cat, catIndex) => (
                        <div key={catIndex} className={styles.categoryBox}>
                            <input
                                type="text"
                                placeholder="Nome da Categoria (ex: Fit Cultural)"
                                value={cat.name}
                                onChange={(e) => handleCategoryChange(catIndex, e.target.value)}
                                className={styles.categoryInput}
                            />
                            <div className={styles.skillsContainer}>
                                {cat.skills.map((skill, skillIndex) => (
                                    <input
                                        key={skillIndex}
                                        type="text"
                                        placeholder="Critério a ser avaliado"
                                        value={skill.name}
                                        onChange={(e) => handleSkillChange(catIndex, skillIndex, e.target.value)}
                                        className={styles.skillInput}
                                    />
                                ))}
                            </div>
                            <button onClick={() => addSkill(catIndex)} className={styles.addSkillButton}>+ Adicionar Critério</button>
                        </div>
                    ))}
                    <button onClick={addCategory} className={styles.addCategoryButton}>+ Adicionar Categoria</button>
                </main>
                <footer className={styles.footer}>
                    <button onClick={handleSubmit} className={styles.submitButton}>{application ? 'Criar e Avaliar' : 'Salvar Scorecard'}</button>
                </footer>
            </div>
        </div>
    );
};

export default CreateScorecardView;