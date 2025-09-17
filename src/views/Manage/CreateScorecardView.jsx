// CRIE O ARQUIVO src/views/Shared/Scorecard/CreateScorecardView.jsx

import React, { useState } from 'react';
import styles from './CreateScorecardView.module.css'; // Crie um CSS para ele

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
        // Validação simples
        if (categories.some(c => !c.name || c.skills.some(s => !s.name))) {
            alert('Por favor, preencha todos os nomes de categorias e habilidades.');
            return;
        }
        // O `jobStageId` pode ser pego da aplicação ou ser um valor padrão
        const jobStageId = application.stage.id; 
        onSubmit(job.id, jobStageId, categories);
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h2>Criar Scorecard para a Vaga</h2>
                <button onClick={onCancel} className={styles.closeButton}>×</button>
            </header>
            <main className={styles.main}>
                <p>A vaga "{job.name}" ainda não possui um scorecard. Defina as categorias e critérios de avaliação abaixo.</p>
                {categories.map((cat, catIndex) => (
                    <div key={catIndex} className={styles.categoryBox}>
                        <input 
                            type="text" 
                            placeholder="Nome da Categoria (ex: Fit Cultural)" 
                            value={cat.name} 
                            onChange={(e) => handleCategoryChange(catIndex, e.target.value)}
                            className={styles.categoryInput}
                        />
                        {cat.skills.map((skill, skillIndex) => (
                             <input 
                                key={skillIndex}
                                type="text" 
                                placeholder="Critério/Habilidade a ser avaliada" 
                                value={skill.name} 
                                onChange={(e) => handleSkillChange(catIndex, skillIndex, e.target.value)}
                                className={styles.skillInput}
                            />
                        ))}
                        <button onClick={() => addSkill(catIndex)} className={styles.addButton}>+ Adicionar Critério</button>
                    </div>
                ))}
                 <button onClick={addCategory} className={styles.addButton}>+ Adicionar Categoria</button>
            </main>
            <footer className={styles.footer}>
                 <button onClick={handleSubmit} className={styles.submitButton}>Criar e Avaliar Candidato</button>
            </footer>
        </div>
    );
};

export default CreateScorecardView;