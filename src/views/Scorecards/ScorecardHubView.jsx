// ARQUIVO COMPLETO E CORRIGIDO: src/views/Scorecards/ScorecardHubView.jsx

import React, { useState, useEffect } from 'react';
import styles from './ScorecardHubView.module.css';
import Header from '../../components/Header/Header';
import { BsSearch, BsPuzzle, BsPencilFill, BsTrashFill, BsChevronDown, BsChevronUp, BsEye, BsEyeSlash } from 'react-icons/bs';

const ScorecardHubView = ({ scorecards, onAddNew, onEdit, onDelete, onFilterChange }) => {
  // Estado para controlar quais cards estão expandidos
  // Por padrão, todos começam expandidos (User Request)
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [isAllExpanded, setIsAllExpanded] = useState(true);

  // Inicializa expandindo tudo quando os scorecards mudam
  useEffect(() => {
    if (scorecards.length > 0) {
      const allIds = new Set(scorecards.map(sc => sc.id));
      setExpandedIds(allIds);
      setIsAllExpanded(true);
    }
  }, [scorecards]);

  // Toggle Global
  const toggleGlobalExpand = () => {
    if (isAllExpanded) {
      setExpandedIds(new Set()); // Fecha tudo
    } else {
      const allIds = new Set(scorecards.map(sc => sc.id));
      setExpandedIds(allIds); // Abre tudo
    }
    setIsAllExpanded(!isAllExpanded);
  };

  // Toggle Individual
  const toggleCard = (id) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedIds(newSet);

    // Atualiza o estado global visualmente se necessário (opcional, mas bom UX)
    if (newSet.size === scorecards.length) setIsAllExpanded(true);
    if (newSet.size === 0) setIsAllExpanded(false);
  };

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

        <div className={styles.actions}>
          <button
            onClick={toggleGlobalExpand}
            className={styles.toggleAllButton}
            title={isAllExpanded ? "Recolher todos os detalhes" : "Expandir todos os detalhes"}
          >
            {isAllExpanded ? <><BsEyeSlash /> Recolher Detalhes</> : <><BsEye /> Expandir Detalhes</>}
          </button>
          <button onClick={onAddNew} className={styles.addButton}>
            + Criar Novo Modelo
          </button>
        </div>
      </div>

      <main className={styles.cardList}>
        {scorecards.length > 0 ? (
          scorecards.map(sc => {
            const isExpanded = expandedIds.has(sc.id);
            return (
              <div key={sc.id} className={styles.scorecardCard}>
                <div
                  className={styles.cardHeader}
                  onClick={() => toggleCard(sc.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.headerTitleGroup}>
                    <h3 className={styles.cardTitle}>{sc.name}</h3>
                    <span className={`${styles.atsTag} ${styles[sc.ats]}`}>
                      {sc.ats === 'inhire' ? 'InHire' : 'Interno'}
                    </span>
                  </div>
                  <div className={styles.expandIcon}>
                    {isExpanded ? <BsChevronUp /> : <BsChevronDown />}
                  </div>
                </div>

                {/* Seção de Perguntas/Critérios - Expansível */}
                {isExpanded && (
                  <div className={styles.cardBody}>
                    <p style={{ marginBottom: '12px' }}>
                      <strong>{sc.categories.length}</strong> Categorias,
                      <strong>{sc.categories.reduce((acc, cat) => acc + (cat.criteria || []).length, 0)}</strong> Critérios
                    </p>

                    {/* Lista de Categorias e Critérios */}
                    <div className={styles.criteriaPreview}>
                      {sc.categories.map((cat, catIdx) => (
                        <div key={catIdx} className={styles.categoryPreview}>
                          <span className={styles.categoryLabel}>{cat.name || 'Categoria sem nome'}</span>
                          <ul className={styles.criteriaList}>
                            {(cat.criteria || []).slice(0, 3).map((crit, critIdx) => (
                              <li key={critIdx} className={styles.criterionPreviewItem}>
                                {crit.name || 'Critério sem nome'}
                              </li>
                            ))}
                            {(cat.criteria || []).length > 3 && (
                              <li className={styles.criterionPreviewMore}>
                                +{(cat.criteria || []).length - 3} mais...
                              </li>
                            )}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className={styles.cardFooter}>
                  <button onClick={() => onEdit(sc)} className={styles.actionButton}>
                    <BsPencilFill /> Editar
                  </button>
                  <button onClick={() => onDelete(sc.id)} className={`${styles.actionButton} ${styles.deleteButton}`}>
                    <BsTrashFill /> Excluir
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <p className={styles.emptyState}>Nenhum modelo de scorecard encontrado. Que tal criar um novo?</p>
        )}
      </main>
    </div>
  );
};

export default ScorecardHubView;