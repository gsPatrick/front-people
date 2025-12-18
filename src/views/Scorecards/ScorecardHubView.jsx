// ARQUIVO COMPLETO E CORRIGIDO: src/views/Scorecards/ScorecardHubView.jsx

import React from 'react';
import styles from './ScorecardHubView.module.css';
import Header from '../../components/Header/Header';
import { BsSearch, BsPuzzle, BsPencilFill, BsTrashFill } from 'react-icons/bs';

const ScorecardHubView = ({ scorecards, onAddNew, onEdit, onDelete, onFilterChange }) => {
  return (
    <div className={styles.container}>
      <Header 
        title="Modelos de Scorecard" 
        subtitle="Crie e gerencie seus modelos de avaliação" 
      />
      
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <div className={styles.searchBar}>
            <BsSearch className={styles.searchIcon} />
            <input type="text" placeholder="Buscar modelo..." onChange={(e) => onFilterChange('term', e.target.value)} />
          </div>
          <div className={styles.atsFilter}>
            <BsPuzzle className={styles.filterIcon} />
            <select onChange={(e) => onFilterChange('ats', e.target.value)}>
              <option value="all">Todas as Integrações</option>
              <option value="internal">Interno</option>
              <option value="inhire">InHire</option>
            </select>
          </div>
        </div>
        <button onClick={onAddNew} className={styles.addButton}>
          + Criar Novo Modelo
        </button>
      </div>

      <main className={styles.cardList}>
        {scorecards.length > 0 ? (
          scorecards.map(sc => (
            <div key={sc.id} className={styles.scorecardCard}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{sc.name}</h3>
                <span className={`${styles.atsTag} ${styles[sc.ats]}`}>
                  {sc.ats === 'inhire' ? 'InHire' : 'Interno'}
                </span>
              </div>
              <div className={styles.cardBody}>
                <p>
                  <strong>{sc.categories.length}</strong> Categorias, 
                  {/* <-- MUDANÇA DE `skills` PARA `criteria` AQUI --> */}
                  <strong>{sc.categories.reduce((acc, cat) => acc + (cat.criteria || []).length, 0)}</strong> Critérios
                </p>
              </div>
              <div className={styles.cardFooter}>
                <button onClick={() => onEdit(sc)} className={styles.actionButton}>
                  <BsPencilFill /> Editar
                </button>
                <button onClick={() => onDelete(sc.id)} className={`${styles.actionButton} ${styles.deleteButton}`}>
                  <BsTrashFill /> Excluir
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className={styles.emptyState}>Nenhum modelo de scorecard encontrado. Que tal criar um novo?</p>
        )}
      </main>
    </div>
  );
};

export default ScorecardHubView;