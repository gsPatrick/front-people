// src/views/Manage/TalentsDashboardView.jsx

import React, { useState, useEffect } from 'react'; // 'useState' ainda é usado para 'selectedJobId' mas o useEffect de sync foi removido
import styles from './TalentsDashboardView.module.css';
import Header from '../../components/Header/Header';

const SearchIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> );
const BriefcaseIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg> );

const TalentsDashboardView = ({ 
    talents, 
    onSelectTalent, 
    onLoadMore, 
    hasNextPage, 
    isPagingLoading,
    // MODIFICADO: props para os valores e a função de mudança
    searchTerm, 
    selectedJobId, 
    onFilterChange, 
    jobs,
    isLoading // Adicionado isLoading
}) => {
  // Os inputs agora são componentes controlados pelas props
  // `useState`s locais para os inputs não são mais necessários aqui
  // ou podem ser usados para "rascunho" de input e só chamar onFilterChange no debounce.
  // Vou manter como controlled components, é mais limpo para este caso.
  // const [searchTermLocal, setSearchTermLocal] = useState(searchTerm); // Removido
  // const [selectedJobIdLocal, setSelectedJobIdLocal] = useState(selectedJobId); // Removido


  // Funções para manipular a mudança dos inputs e repassar para o pai
  const handleSearchTermChange = (e) => {
    // setSearchTermLocal(e.target.value); // Removido
    onFilterChange({ searchTerm: e.target.value, selectedJobId });
  };

  const handleSelectedJobIdChange = (e) => {
    // setSelectedJobIdLocal(e.target.value); // Removido
    onFilterChange({ searchTerm, selectedJobId: e.target.value });
  };

  return (
    <div className={styles.container}>
      <Header 
        title="Banco de Talentos" 
        subtitle={`${talents.length} talento(s) carregados`} 
      />
      
      <div className={styles.filtersContainer}>
        <div className={styles.searchBar}>
            <SearchIcon className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar por nome, headline ou LinkedIn username..." 
              value={searchTerm} // Valor controlado pela prop
              onChange={handleSearchTermChange} // Chama a função para repassar a mudança
              className={styles.searchInput}
            />
        </div>
        <div className={styles.jobFilter}>
            <BriefcaseIcon />
            <select 
                value={selectedJobId} // Valor controlado pela prop
                onChange={handleSelectedJobIdChange} // Chama a função para repassar a mudança
            >
                <option value="">Todas as Vagas</option>
                {jobs.map(job => (
                    <option key={job.id} value={job.id}>{job.name}</option>
                ))}
            </select>
        </div>
      </div>

      <main className={styles.talentList}>
        {isLoading ? ( // Usa o isLoading geral do Popup para a carga inicial
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
        {/* Botão "Carregar Mais" */}
        {hasNextPage && (
            <div className={styles.loadMoreContainer}>
                <button onClick={onLoadMore} disabled={isPagingLoading} className={styles.loadMoreButton}>
                    {isPagingLoading ? <span className={styles.loaderSmall}></span> : 'Carregar Mais Talentos'}
                </button>
            </div>
        )}
      </main>
    </div>
  );
};

export default TalentsDashboardView;