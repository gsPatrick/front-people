// COLE ESTE CÓDIGO NO ARQUIVO: src/views/Manage/JobDetailsView.jsx

import React, { useMemo, useState } from 'react';
import styles from './JobDetailsView.module.css';
import Header from '../../components/Header/Header';
import { BsSearch } from 'react-icons/bs'; // Importa o ícone de busca

const TABS = [
  { key: 'active', label: 'Ativos' },
  { key: 'declined', label: 'Desistentes' },
  { key: 'rejected', label: 'Reprovados' }
];

const JobDetailsView = ({ job, candidates, onBack, onUpdateApplicationStatus, onSelectCandidateForDetails, availableStages }) => {
  const [activeTab, setActiveTab] = useState('active');
  const [selectedStageFilter, setSelectedStageFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState(''); // <-- Estado para a busca

  const candidatesInTab = useMemo(() => {
    return candidates.filter(c => (c.application.status || '').toLowerCase() === activeTab);
  }, [candidates, activeTab]);

  const filteredAndSortedCandidates = useMemo(() => {
    return candidatesInTab
      .filter(c => {
        // Filtro por etapa
        const stageMatch = selectedStageFilter === 'all' || c.application.stageId === selectedStageFilter;
        // Filtro por termo de busca (case-insensitive)
        const searchMatch = searchTerm === '' || c.name.toLowerCase().includes(searchTerm.toLowerCase());
        return stageMatch && searchMatch;
      })
      .sort((a, b) => new Date(b.application.createdAt) - new Date(a.application.createdAt));
  }, [candidatesInTab, selectedStageFilter, searchTerm]);


  return (
    <div className={styles.container}>
      <Header
        title={job.name}
        subtitle={`${candidates.length} Candidato(s) no total`}
        onBack={onBack}
      />

      <div className={styles.filtersContainer}>
        {/* Adiciona o campo de busca aqui */}
        <div className={styles.searchBar}>
          <BsSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Buscar candidato por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

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
            {availableStages.map(stage => (
              <option key={stage.id} value={stage.id}>{stage.name}</option>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className={styles.candidateName}>{candidate.name}</span>
                      {/* BADGE DE FONTE (LOCAL/CLOUD) */}
                      <span
                        className={`${styles.sourceBadge} ${candidate.externalId || candidate.syncStatus === 'SYNCED' ? styles.sourceCloud : styles.sourceLocal}`}
                        title={candidate.externalId ? "Sincronizado com InHire" : "Apenas Local"}
                      >
                        {candidate.externalId || candidate.syncStatus === 'SYNCED' ? 'InHire' : 'Local'}
                      </span>
                    </div>
                    <span className={styles.candidateHeadline}>{candidate.headline}</span>
                  </div>
                </div>
              </div>

              <div className={styles.statusSelectWrapper}>
                <select
                  className={styles.statusSelect}
                  value={candidate.application.stageId}
                  onChange={(e) => onUpdateApplicationStatus(candidate.application.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  title="Alterar etapa da candidatura"
                >
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