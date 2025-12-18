import React, { useState } from 'react';
import styles from './ScorecardEditView.module.css';
import Header from '../../components/Header/Header';

const ScorecardEditView = ({ onSave, onCancel, initialData }) => {
  const isEditing = !!initialData?.id;
  const isCreatingFromTemplate = initialData && !initialData.id;
  
  const initialName = isCreatingFromTemplate ? `Cópia de ${initialData.name}` : initialData?.name || '';
  const initialCategories = initialData?.categories?.map(cat => ({
      name: cat.name,
      // Garante que a propriedade seja sempre 'criteria'
      criteria: cat.criteria || cat.skills || [{ name: '' }] 
  })) || [{ name: '', criteria: [{ name: '' }] }];

  const [name, setName] = useState(initialName);
  const [categories, setCategories] = useState(initialCategories);

  const handleCategoryChange = (index, value) => {
    const newCategories = [...categories];
    newCategories[index].name = value;
    setCategories(newCategories);
  };

  const handleCriterionChange = (catIndex, critIndex, value) => {
    const newCategories = [...categories];
    newCategories[catIndex].criteria[critIndex].name = value;
    setCategories(newCategories);
  };

  const addCategory = () => setCategories([...categories, { name: '', criteria: [{ name: '' }] }]);
  const addCriterion = (catIndex) => {
    const newCategories = [...categories];
    newCategories[catIndex].criteria.push({ name: '' });
    setCategories(newCategories);
  };

  const handleSave = () => {
    if (!name.trim()) return alert('O nome do modelo é obrigatório.');
    
    const payload = {
        id: isEditing ? initialData.id : undefined,
        name,
        atsIntegration: 'internal', // Sempre será interno
        categories: categories.map(cat => ({
            name: cat.name,
            criteria: cat.criteria.filter(crit => crit.name.trim() !== '') // Envia apenas critérios preenchidos
        }))
    };
    onSave(payload);
  };

  return (
    <div className={styles.container}>
      <Header 
        title={isEditing ? 'Editar Modelo' : 'Criar Novo Modelo'} 
        subtitle="Defina os critérios de avaliação"
        onBack={onCancel}
      />

      <main className={styles.form}>
        <div className={styles.inputGroup}>
          <label>Nome do Modelo</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Desenvolvedor(a) Sênior" />
        </div>

        <div className={styles.structureBuilder}>
          <h4 className={styles.builderTitle}>Estrutura de Avaliação</h4>
          {categories.map((cat, catIndex) => (
            <div key={catIndex} className={styles.categoryBox}>
              <input type="text" placeholder="Nome da Categoria (ex: Fit Cultural)" value={cat.name} onChange={(e) => handleCategoryChange(catIndex, e.target.value)} className={styles.categoryInput} />
              <div className={styles.criteriaContainer}>
                {cat.criteria.map((crit, critIndex) => (
                  <input key={critIndex} type="text" placeholder="Critério a ser avaliado" value={crit.name} onChange={(e) => handleCriterionChange(catIndex, critIndex, e.target.value)} className={styles.criterionInput} />
                ))}
              </div>
              <button onClick={() => addCriterion(catIndex)} className={styles.addCriterionButton}>+ Adicionar Critério</button>
            </div>
          ))}
          <button onClick={addCategory} className={styles.addCategoryButton}>+ Adicionar Categoria</button>
        </div>
      </main>

      <footer className={styles.footer}>
        <button onClick={onCancel} className={styles.cancelButton}>Cancelar</button>
        <button onClick={handleSave} className={styles.saveButton}>Salvar Modelo</button>
      </footer>
    </div>
  );
};

export default ScorecardEditView;