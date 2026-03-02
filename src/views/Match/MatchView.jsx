// ARQUIVO ATUALIZADO: src/views/Match/MatchView.jsx

import React from 'react';
import styles from './MatchView.module.css';
import Header from '../../components/Header/Header';
import { BsCollection } from 'react-icons/bs';

const MatchView = ({ scorecards, onBatchSelect, onGoToHub, onViewJob }) => {
  return (
    <div className={styles.container}>
      <Header
        title="Match Inteligente"
        subtitle="Analise múltiplos perfis do LinkedIn em lote"
      />

      <main className={styles.cardList}>
        {scorecards.length > 0 ? scorecards.map(sc => {
          return (
            <div 
              key={sc.id} 
              className={styles.scorecardCard}
              onClick={() => onBatchSelect(sc.id)}
            >
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{sc.name}</h3>
                <div className={styles.metaRow}>
                  <span className={`${styles.atsTag} ${styles[sc.atsIntegration || 'internal']}`}>
                    {sc.atsIntegration === 'inhire' ? 'InHire' : 'Local'}
                  </span>
                  {sc.job && (
                    <div className={styles.jobInfo}>
                      <span className={styles.jobLabel}>Vaga:</span>
                      <span className={styles.jobName}>{sc.job.name || sc.job.title}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.cardActions}>
                {sc.job && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onViewJob(sc.job); }} 
                    className={styles.viewJobButton} 
                    title="Ver detalhes da vaga"
                  >
                    Ver Vaga
                  </button>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); onBatchSelect(sc.id); }} 
                  className={styles.batchButton}
                >
                  <BsCollection /> Iniciar Fila
                </button>
              </div>
            </div>
          );
        }) : (
          <div className={styles.emptyState}>
            <p>Você ainda não criou nenhum modelo de scorecard.</p>
            <button onClick={onGoToHub} className={styles.createButton}>
              Criar meu primeiro scorecard
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default MatchView;