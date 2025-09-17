import React, { useState, useMemo } from 'react';
import styles from './JobsDashboardView.module.css';
import Header from '../../components/Header/Header';

// Ícones
const UsersIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> );
const AreaIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg> );
const SlaIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> );
const TagIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg> );

// CORREÇÃO: Usar os valores da API para o filtro e mapear para labels
const JOB_STATUSES = [
    { value: 'open', label: 'Aberta' },
    { value: 'paused', label: 'Congelada' },
    { value: 'closed', label: 'Fechada' },
    { value: 'canceled', label: 'Cancelada' }
];

const JobsDashboardView = ({ jobs, onSelectJob, onBack, isSelectionMode = false }) => {
  const [activeStatusFilter, setActiveStatusFilter] = useState('open'); // O estado agora armazena o valor da API
  const [selectedTag, setSelectedTag] = useState('all');

  const title = isSelectionMode ? "Selecione a Vaga" : "Dashboard de Vagas";
  const subtitle = isSelectionMode ? "Associe o candidato à vaga." : "Filtre e gerencie suas vagas.";
  
  const allTags = useMemo(() => {
    const tagsSet = new Set();
    jobs.forEach(job => job.tags.forEach(tag => tagsSet.add(tag.name)));
    return Array.from(tagsSet);
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs
      .filter(job => job.status === activeStatusFilter)
      .filter(job => selectedTag === 'all' || job.tags.some(tag => tag.name === selectedTag));
  }, [jobs, activeStatusFilter, selectedTag]);

  return (
    <div className={styles.container}>
      <Header title={title} subtitle={subtitle} onBack={onBack && isSelectionMode ? onBack : null} />
      
      {!isSelectionMode && (
          <div className={styles.filtersBar}>
            <div className={styles.statusFilters}>
              {JOB_STATUSES.map(status => (
                  <button 
                      key={status.value}
                      className={`${styles.filterButton} ${activeStatusFilter === status.value ? styles.active : ''}`}
                      onClick={() => setActiveStatusFilter(status.value)}
                  >
                      {status.label}
                  </button>
              ))}
            </div>
            {allTags.length > 0 && (
                <div className={styles.tagSelectorWrapper}>
                    <TagIcon />
                    <select
                        className={styles.tagSelector}
                        value={selectedTag}
                        onChange={(e) => setSelectedTag(e.target.value)}
                    >
                        <option value="all">Todas as Tags</option>
                        {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                    </select>
                </div>
            )}
          </div>
      )}

      <main className={styles.jobList}>
        {filteredJobs.length > 0 ? (
          filteredJobs.map(job => (
            <button key={job.id} className={styles.jobCard} onClick={() => onSelectJob(job)}>
              <div className={styles.jobInfo}>
                <span className={styles.jobName}>{job.name}</span>
                <div className={styles.jobDetails}>
                    <span className={styles.detailItem}><AreaIcon /> {job.area || 'N/A'}</span>
                    <span className={styles.detailItem}><UsersIcon /> {job.activeTalents || 0} Ativos</span>
                    <span className={styles.detailItem}><SlaIcon /> SLA: {job.slaDaysGoal || 'N/A'} dias</span>
                </div>
              </div>
              <span className={styles.arrow}>→</span>
            </button>
          ))
        ) : (
          <p className={styles.emptyState}>Nenhuma vaga encontrada para os filtros selecionados.</p>
        )}
      </main>
    </div>
  );
};

export default JobsDashboardView;