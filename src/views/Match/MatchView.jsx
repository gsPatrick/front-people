// ARQUIVO ATUALIZADO: src/views/Match/MatchView.jsx

import React from 'react';
import styles from './MatchView.module.css';
import Header from '../../components/Header/Header';
import { BsBullseye, BsCheckLg } from 'react-icons/bs';

const MatchView = ({ scorecards, activeScorecardId, onSelect, onDeactivate, onGoToHub }) => {
  return (
    <div className={styles.container}>
      <Header 
        title="Modo de Match"
        subtitle="Selecione um scorecard para analisar perfis no LinkedIn"
      />

      {activeScorecardId && (
        <div className={styles.deactivateSection}>
          <button onClick={onDeactivate} className={styles.deactivateButton}>
            Desativar Modo Match
          </button>
        </div>
      )}

      <main className={styles.cardList}>
        {scorecards.length > 0 ? scorecards.map(sc => {
          const isActive = sc.id === activeScorecardId;
          return (
            <div key={sc.id} className={`${styles.scorecardCard} ${isActive ? styles.active : ''}`}>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{sc.name}</h3>
                <span className={`${styles.atsTag} ${styles[sc.atsIntegration]}`}>
                  {sc.atsIntegration === 'inhire' ? 'InHire' : 'Interno'}
                </span>
              </div>
              {/* MUDANÇA: O onClick agora chama onSelect passando apenas o ID */}
              <button onClick={() => onSelect(sc.id)} className={styles.selectButton}>
                {isActive ? <><BsCheckLg /> Ativo</> : <><BsBullseye /> Ativar</>}
              </button>
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