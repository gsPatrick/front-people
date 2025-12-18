// COLE ESTE CÓDIGO NO ARQUIVO: src/views/Shared/Scorecard/CreateScorecardView.jsx

import React, { useState } from 'react';
import styles from './CreateScorecardView.module.css';

const CreateScorecardView = ({ job, application, onSubmit, onCancel }) => {
    const [categories, setCategories] = useState([{ name: '', skills: [{ name: '' }] }]);

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
        if (categories.some(c => !c.name.trim() || c.skills.some(s => !s.name.trim()))) {
            alert('Por favor, preencha todos os nomes de categorias e critérios.');
            return;
        }

        // ==========================================================
        // CORREÇÃO 1: Usar application.stageId diretamente.
        // O objeto 'application' não tem um 'stage' aninhado.
        // ==========================================================
        const jobStageId = application.stageId;
        if (!jobStageId) {
            alert("Erro crítico: ID da etapa da candidatura não encontrado. Não é possível criar o kit.");
            return;
        }
        
        // ==========================================================
        // CORREÇÃO 2: Montar o payload como um único objeto,
        // conforme esperado pelo orquestrador 'handleCreateScorecardAndKit'.
        // ==========================================================
        const payload = {
            jobId: job.id,
            jobStageId: jobStageId,
            name: `Avaliação - ${application.stageName}`, // Nome padrão para o kit
            script: '', // Script pode ser adicionado no futuro
            skillCategories: categories.map(c => ({
                name: c.name,
                skills: c.skills.map(s => ({ name: s.name }))
            }))
        };
        
        onSubmit(payload);
    };

    return (
        // O JSX permanece o mesmo, apenas a lógica do handleSubmit foi corrigida.
        <div className={styles.overlay} onClick={onCancel}>
            <div className={styles.content} onClick={(e) => e.stopPropagation()}>
                <header className={styles.header}>
                    <button onClick={onCancel} className={styles.backButton}>
                        ←
                    </button>
                    <div className={styles.titleContainer}>
                        <h2 className={styles.title}>Criar Scorecard para a Vaga</h2>
                        <p className={styles.subtitle}>Para a vaga "{job.name}"</p>
                    </div>
                    <button onClick={onCancel} className={styles.closeButton}>×</button>
                </header>
                <main className={styles.main}>
                    <p className={styles.description}>Esta vaga ainda não possui critérios de avaliação definidos. Crie o primeiro kit de entrevista abaixo.</p>
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
                    <button onClick={handleSubmit} className={styles.submitButton}>Criar e Avaliar</button>
                </footer>
            </div>
        </div>
    );
};

export default CreateScorecardView;