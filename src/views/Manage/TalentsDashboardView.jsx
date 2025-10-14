// src/views/Manage/TalentsDashboardView.jsx

import React from 'react';
import styles from './TalentsDashboardView.module.css';
import Header from '../../components/Header/Header';

const SearchIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> );
const BriefcaseIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg> );

// Componente de Paginação para Talentos
const Pagination = ({ onPrev, onNext, hasPrev, hasNext, currentPage }) => {
    // Não renderiza nada se não houver páginas para navegar
    if (!hasPrev && !hasNext) return null;

    return (
        <div className={styles.pagination}>
            <button 
                onClick={onPrev} 
                disabled={!hasPrev}
                className={styles.pageButton}
            >
                ‹ Anterior
            </button>
            <span className={styles.pageInfo}>
                Página {currentPage}
            </span>
            <button 
                onClick={onNext} 
                disabled={!hasNext}
                className={styles.pageButton}
            >
                Próxima ›
            </button>
        </div>
    );
};

const TalentsDashboardView = ({ 
    talents, 
    onSelectTalent, 
    onNextPage,
    onPrevPage,
    hasNextPage,
    hasPrevPage,
    currentPage,
    totalTalentsText,
    isPagingLoading,
    searchTerm, 
    selectedJobId, 
    onFilterChange, 
    jobs,
    isLoading 
}) => {
  
  const handleSearchTermChange = (e) => {
    onFilterChange({ searchTerm: e.target.value, selectedJobId });
  };

  const handleSelectedJobIdChange = (e) => {
    onFilterChange({ searchTerm, selectedJobId: e.target.value });
  };

  return (
    <div className={styles.container}>
      <Header 
        title="Banco de Talentos" 
        subtitle={totalTalentsText} 
      />
      
      <div className={styles.filtersContainer}>
        <div className={styles.searchBar}>
            <SearchIcon className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar por nome, headline ou LinkedIn username..." 
              value={searchTerm}
              onChange={handleSearchTermChange}
              className={styles.searchInput}
            />
        </div>
        <div className={styles.jobFilter}>
            <BriefcaseIcon />
            <select 
                value={selectedJobId}
                onChange={handleSelectedJobIdChange}
            >
                <option value="">Todas as Vagas</option>
                {/* Garante que `jobs` seja um array antes de mapear */}
                {(jobs || []).map(job => (
                    <option key={job.id} value={job.id}>{job.name}</option>
                ))}
            </select>
        </div>
      </div>

      <main className={styles.talentList}>
        {isLoading ? (
            <div className={styles.loaderContainer}><div className={styles.loader}></div></div>
        ) : talents.length > 0 ? (
          talents.map(talent => (
            <button key={talent.id} className={styles.talentCard} onClick={() => onSelectTalent(talent)}>
              <div className={styles.talentInfo}>
                <div className={styles.avatar}>{talent.name ? talent.name.substring(0, 2) : '?'}</div>
                <div className={styles.nameAndHeadline}>
                  <span className={styles.talentName}>{talent.name}</span>
                  <span className={styles.talentHeadline}>{talent.headline || talent.jobTitle || 'Sem título'}</span>
                </div>
              </div>
            </button>
          ))
        ) : (
          <p className={styles.emptyState}>Nenhum talento encontrado para os filtros selecionados.</p>
        )}
      </main>

      <footer className={styles.footer}>
        <Pagination 
            onPrev={onPrevPage}
            onNext={onNextPage}
            hasPrev={hasPrevPage}
            hasNext={hasNextPage}
            currentPage={currentPage}
        />
      </footer>
    </div>
  );
};

export default TalentsDashboardView;