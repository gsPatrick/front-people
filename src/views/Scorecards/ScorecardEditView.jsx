import React, { useState } from 'react';
import styles from './ScorecardEditView.module.css';
import Header from '../../components/Header/Header';
import { BsExclamationTriangleFill, BsStarFill } from 'react-icons/bs';

const WEIGHT_TYPES = [
  { value: 'normal', label: 'Normal', color: 'var(--text-secondary)' },
  { value: 'priority', label: 'Prioridade (2x)', color: '#F59E0B' },
  { value: 'essential', label: 'Imprescindível', color: '#EF4444' }
];

const TagModal = ({ criterionName, initialTag, onConfirm, onCancel }) => {
  const [tag, setTag] = useState(initialTag || '');
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.tagModal}>
        <h4>Definir TAG Imprescindível</h4>
        <p className={styles.tagModalHint}>Critério: <strong>{criterionName}</strong></p>
        <p className={styles.tagModalDescription}>Esta TAG será exibida quando o candidato não atender esse critério. Ajuda a identificar rapidamente o motivo da rejeição.</p>
        <input
          type="text"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="Ex: Inglês Fluente, 5+ anos de experiência..."
          className={styles.tagInput}
          autoFocus
        />
        <div className={styles.tagModalActions}>
          <button onClick={onCancel} className={styles.cancelButton}>Cancelar</button>
          <button onClick={() => onConfirm(tag)} className={styles.confirmButton} disabled={!tag.trim()}>Confirmar</button>
        </div>
      </div>
    </div>
  );
};

const ScorecardEditView = ({ onSave, onCancel, initialData, jobs }) => {
  const isEditing = !!initialData?.id;
  const isCreatingFromTemplate = initialData && !initialData.id;
  
  const initialName = isCreatingFromTemplate ? `Cópia de ${initialData.name}` : initialData?.name || '';
  const rawCategories = initialData?.categories || initialData?.skillCategories;
  const initialCategories = rawCategories?.map(cat => ({
      name: cat.name,
      criteria: (cat.criteria || cat.skills || [{ name: '' }]).map(c => ({
        name: c.name || '',
        weightType: c.weightType || 'normal',
        tag: c.tag || ''
      }))
  })) || [{ name: '', criteria: [{ name: '', weightType: 'normal', tag: '' }] }];

  const [name, setName] = useState(initialName);
  const [categories, setCategories] = useState(initialCategories);
  const [selectedJobId, setSelectedJobId] = useState(initialData?.jobId || '');
  const [syncNow, setSyncNow] = useState(false);
  const [tagModal, setTagModal] = useState(null); // { catIndex, critIndex, criterionName, currentTag }

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

  const handleWeightTypeChange = (catIndex, critIndex, newType) => {
    if (newType === 'essential') {
      const crit = categories[catIndex].criteria[critIndex];
      setTagModal({ catIndex, critIndex, criterionName: crit.name || 'Critério sem nome', currentTag: crit.tag || '' });
    } else {
      const newCategories = [...categories];
      newCategories[catIndex].criteria[critIndex].weightType = newType;
      newCategories[catIndex].criteria[critIndex].tag = '';
      setCategories(newCategories);
    }
  };

  const handleTagConfirm = (tag) => {
    if (tagModal) {
      const newCategories = [...categories];
      newCategories[tagModal.catIndex].criteria[tagModal.critIndex].weightType = 'essential';
      newCategories[tagModal.catIndex].criteria[tagModal.critIndex].tag = tag;
      setCategories(newCategories);
      setTagModal(null);
    }
  };

  const addCategory = () => setCategories([...categories, { name: '', criteria: [{ name: '', weightType: 'normal', tag: '' }] }]);
  const addCriterion = (catIndex) => {
    const newCategories = [...categories];
    newCategories[catIndex].criteria.push({ name: '', weightType: 'normal', tag: '' });
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
            criteria: cat.criteria
              .filter(crit => crit.name.trim() !== '')
              .map(crit => ({
                name: crit.name,
                weightType: crit.weightType || 'normal',
                tag: crit.tag || ''
              }))
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

          {!isEditing && (
            <>
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
            </>
          )}
        </div>

        <div className={styles.structureBuilder}>
          <h4 className={styles.builderTitle}>Estrutura de Avaliação</h4>
          {categories.map((cat, catIndex) => (
            <div key={catIndex} className={styles.categoryBox}>
              <input type="text" placeholder="Nome da Categoria (ex: Fit Cultural)" value={cat.name} onChange={(e) => handleCategoryChange(catIndex, e.target.value)} className={styles.categoryInput} />
              <div className={styles.criteriaContainer}>
                {cat.criteria.map((crit, critIndex) => (
                  <div key={critIndex} className={styles.criterionRow}>
                    <input type="text" placeholder="Critério a ser avaliado" value={crit.name} onChange={(e) => handleCriterionChange(catIndex, critIndex, e.target.value)} className={styles.criterionInput} />
                    <div className={styles.weightSelector}>
                      {WEIGHT_TYPES.map(wt => (
                        <button
                          key={wt.value}
                          className={`${styles.weightButton} ${crit.weightType === wt.value ? styles.weightActive : ''}`}
                          onClick={() => handleWeightTypeChange(catIndex, critIndex, wt.value)}
                          title={
                            wt.value === 'normal' ? 'Peso normal na avaliação' :
                            wt.value === 'priority' ? 'Dobra o valor da nota neste critério' :
                            'Se o candidato não atender, é marcado com borda vermelha para revisão'
                          }
                          style={crit.weightType === wt.value ? { borderColor: wt.color, color: wt.color } : {}}
                        >
                          {wt.value === 'priority' && <BsStarFill style={{ fontSize: '10px' }} />}
                          {wt.value === 'essential' && <BsExclamationTriangleFill style={{ fontSize: '10px' }} />}
                          {wt.label}
                        </button>
                      ))}
                    </div>
                    {crit.weightType === 'essential' && crit.tag && (
                      <div className={styles.tagBadge} title="TAG imprescindível">
                        <BsExclamationTriangleFill /> {crit.tag}
                      </div>
                    )}
                  </div>
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

      {tagModal && (
        <TagModal
          criterionName={tagModal.criterionName}
          initialTag={tagModal.currentTag}
          onConfirm={handleTagConfirm}
          onCancel={() => setTagModal(null)}
        />
      )}
    </div>
  );
};

export default ScorecardEditView;