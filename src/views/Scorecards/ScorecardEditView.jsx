import React, { useState } from 'react';
import styles from './ScorecardEditView.module.css';
import Header from '../../components/Header/Header';

const ScorecardEditView = ({ onSave, onCancel, initialData, jobs }) => {
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
  const [selectedJobId, setSelectedJobId] = useState(initialData?.jobId || '');
  const [syncNow, setSyncNow] = useState(false);

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
    if (!selectedJobId) return alert('Por favor, vincule uma vaga a este scorecard.');
    
    const payload = {
        id: isEditing ? initialData.id : undefined,
        name,
        jobId: selectedJobId,
        syncStatus: syncNow ? 'PENDING' : (initialData?.syncStatus || 'PENDING'),
        atsIntegration: initialData?.atsIntegration || 'internal',
        categories: categories.map(cat => ({
            name: cat.name,
            criteria: cat.criteria.filter(crit => crit.name.trim() !== '')
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
        <div className={styles.setupGroup} style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
          <div className={styles.inputGroup}>
            <label>Nome do Modelo</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Desenvolvedor(a) Sênior" />
          </div>

          <div className={styles.inputGroup}>
            <label>Vaga Vinculada *</label>
            <select 
              value={selectedJobId} 
              onChange={(e) => setSelectedJobId(e.target.value)}
              className={styles.jobSelect}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            >
              <option value="">Selecione uma vaga...</option>
              {(jobs || []).map(j => (
                <option key={j.id} value={j.id}>{j.name || j.title}</option>
              ))}
            </select>
          </div>

          <div className={styles.syncOptionRow} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0' }}>
            <input 
              type="checkbox" 
              id="syncNow" 
              checked={syncNow} 
              onChange={(e) => setSyncNow(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="syncNow" style={{ cursor: 'pointer', fontSize: '14px', color: 'var(--accent-primary)', fontWeight: '500' }}>
              Sincronizar com InHire após salvar
            </label>
          </div>
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