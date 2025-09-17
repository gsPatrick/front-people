// src/views/Manage/JobDetailsView.jsx

import React, { useMemo, useState } from 'react';
import styles from './JobDetailsView.module.css';
import Header from '../../components/Header/Header';

const TABS = [
    { key: 'active', label: 'Ativos' },
    { key: 'declined', label: 'Desistentes' },
    { key: 'rejected', label: 'Reprovados' }
];

// ATUALIZADO: Recebe a nova prop `availableStages`
const JobDetailsView = ({ job, candidates, onBack, onUpdateApplicationStatus, onSelectCandidateForDetails, availableStages }) => {
  const [activeTab, setActiveTab] = useState('active');
  const [selectedStageFilter, setSelectedStageFilter] = useState('all');

  const candidatesInTab = useMemo(() => {
    return candidates.filter(c => c.application.status === activeTab);
  }, [candidates, activeTab]);

  // Este useMemo é apenas para o filtro na UI (no topo)
  const stagesForFilter = useMemo(() => {
    const stages = new Set(candidatesInTab.map(c => c.application.stageName));
    return Array.from(stages);
  }, [candidatesInTab]);
  
  const filteredAndSortedCandidates = useMemo(() => {
    return candidatesInTab
      .filter(c => selectedStageFilter === 'all' || c.application.stageName === selectedStageFilter)
      .sort((a, b) => new Date(b.application.createdAt) - new Date(a.application.createdAt));
  }, [candidatesInTab, selectedStageFilter]);


  return (
    <div className={styles.container}>
      <Header 
        title={job.name} 
        subtitle={`${candidates.length} Candidato(s) no total`} 
        onBack={onBack} 
      />
      
      <div className={styles.filtersContainer}>
        <div className={styles.tabs}>
            {TABS.map(tab => (
                <button 
                    key={tab.key}
                    className={`${styles.tabButton} ${activeTab === tab.key ? styles.active : ''}`}
                    onClick={() => {
                        setActiveTab(tab.key);
                        setSelectedStageFilter('all');
                    }}
                >
                    {tab.label}
                </button>
            ))}
        </div>
        <div className={styles.stageSelectorWrapper}>
            <select 
                className={styles.stageSelector}
                value={selectedStageFilter}
                onChange={(e) => setSelectedStageFilter(e.target.value)}
            >
                <option value="all">Todas as Etapas</option>
                {/* O filtro da UI continua usando nomes */}
                {stagesForFilter.map(stageName => (
                    <option key={stageName} value={stageName}>{stageName}</option>
                ))}
            </select>
        </div>
      </div>

      <main className={styles.candidateList}>
        {filteredAndSortedCandidates.length > 0 ? (
          filteredAndSortedCandidates.map(candidate => (
            <div key={candidate.application.id} className={styles.candidateCard}>
              <div className={styles.clickableArea} onClick={() => onSelectCandidateForDetails(candidate, job)}>
                  <div className={styles.candidateInfo}>
                      <div className={styles.avatar}>
                          {candidate.name.substring(0, 2)}
                      </div>
                      <div className={styles.nameAndHeadline}>
                          <span className={styles.candidateName}>{candidate.name}</span>
                          <span className={styles.candidateHeadline}>{candidate.headline}</span>
                      </div>
                  </div>
              </div>
              
              <div className={styles.statusSelectWrapper}>
                {/* CORREÇÃO APLICADA AQUI */}
                <select 
                  className={styles.statusSelect}
                  value={candidate.application.stageId} // Usa o ID da etapa da aplicação
                  onChange={(e) => onUpdateApplicationStatus(candidate.application.id, e.target.value)} // Envia o ID selecionado
                  onClick={(e) => e.stopPropagation()}
                  title="Alterar etapa da candidatura"
                >
                  {/* Itera sobre a prop `availableStages` que contém {id, name} */}
                  {availableStages.map(stage => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.clickableArea} onClick={() => onSelectCandidateForDetails(candidate, job)}>
                  <span className={styles.arrow}>→</span>
              </div>
            </div>
          ))
        ) : (
          <p className={styles.emptyState}>Nenhum candidato encontrado para os filtros selecionados.</p>
        )}
      </main>
      
    </div>
  );
};

export default JobDetailsView;