// COLE ESTE CÓDIGO ATUALIZADO NO ARQUIVO: src/views/Manage/TalentsDashboardView.jsx

import React from 'react';
import styles from './TalentsDashboardView.module.css';
import Header from '../../components/Header/Header';

const SearchIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>);

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className={styles.pagination}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={styles.pageButton}
      >
        ‹ Anterior
      </button>
      <span className={styles.pageInfo}>
        Página {currentPage} de {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={styles.pageButton}
      >
        Próxima ›
      </button>
    </div>
  );
};

const TalentsDashboardView = ({
  talentsData,
  onSelectTalent,
  handleTalentsPageChange,
  filters,
  onFilterChange,
  isPagingLoading,
  isLoading,
  isSelectionMode = false, // <-- Prop Nova
  onCancel // <-- Prop Nova
}) => {

  const handleSearchTermChange = (e) => {
    onFilterChange({ searchTerm: e.target.value });
  };

  const talentsToDisplay = Array.isArray(talentsData.talents) ? talentsData.talents : [];

  return (
    <div className={styles.container}>
      <Header
        title={isSelectionMode ? "Selecionar Talento" : "Banco de Talentos"}
        subtitle={isSelectionMode ? "Clique em um talento para adicionar à vaga." : `${talentsData.totalTalents || 0} talentos encontrados`}
        onBack={isSelectionMode && onCancel ? onCancel : null}
      />

      <div className={styles.filtersContainer}>
        <div className={styles.searchBar}>
          <SearchIcon className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Buscar por nome ou headline..."
            value={filters.searchTerm}
            onChange={handleSearchTermChange}
            className={styles.searchInput}
          />
        </div>
      </div>

      <main className={styles.talentList}>
        {isLoading && talentsToDisplay.length === 0 ? (
          <div className={styles.loaderContainer}><div className={styles.loader}></div></div>
        ) : talentsToDisplay.length > 0 ? (
          talentsToDisplay.map(talent => (
            <button key={talent.id} className={styles.talentCard} onClick={() => onSelectTalent(talent)}>
              <div className={styles.talentInfo}>
                <div className={styles.avatar}>{talent.name ? talent.name.substring(0, 2) : '?'}</div>
                <div className={styles.nameAndHeadline}>
                  <span className={styles.talentName}>{talent.name}</span>
                  <span className={styles.talentHeadline}>{talent.headline || 'Sem título'}</span>
                </div>
              </div>
            </button>
          ))
        ) : (
          <p className={styles.emptyState}>Nenhum talento encontrado para os filtros selecionados.</p>
        )}
        {isPagingLoading && <div className={styles.loaderContainer}><div className={styles.loader}></div></div>}
      </main>

      <footer className={styles.footer}>
        <Pagination
          currentPage={talentsData.currentPage}
          totalPages={talentsData.totalPages}
          onPageChange={handleTalentsPageChange}
        />
      </footer>
    </div>
  );
};

export default TalentsDashboardView;