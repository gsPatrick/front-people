// SUBSTITUA O ARQUIVO: src/views/Match/MatchResultView.jsx

import React from 'react';
import styles from './MatchResultView.module.css';
import Header from '../../components/Header/Header';

// Ícones
const UploadIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>);
const AddUserIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="23" y2="17"/><line x1="20" y1="14" x2="26" y2="14"/></svg>);
const LockIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>);
const UnlockIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>);
const LoadingSpinner = () => <div className={styles.loadingSpinner}></div>;

// Componente para a barra de pontuação
const ScoreBar = ({ score }) => (
  <div className={styles.scoreBarContainer}>
    <div className={styles.scoreBarFill} style={{ width: `${score}%` }} />
  </div>
);

const MatchResultView = ({
  activeScorecard,
  matchResult,
  isLoading,
  isLocked,
  onAddTalent,
  onChangeScorecard,
  onToggleLock
}) => {
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className={styles.stateContainer}>
          <LoadingSpinner />
          <p className={styles.stateText}>Analisando perfil... A IA está trabalhando.</p>
        </div>
      );
    }

    if (!matchResult) {
      return (
        <div className={styles.stateContainer}>
          <div className={styles.welcomeIcon}><UploadIcon /></div>
          <h3 className={styles.welcomeTitle}>Aguardando Perfil</h3>
          <p className={styles.stateText}>
            Arraste e solte um arquivo PDF do LinkedIn nesta janela para iniciar a análise de match.
          </p>
        </div>
      );
    }

    // Se tivermos um resultado, renderiza a análise
    return (
      <div className={styles.resultsContainer}>
        <div className={styles.summaryHeader}>
          <div className={styles.overallScoreWrapper}>
            <span className={styles.overallScore}>{matchResult.overallScore}%</span>
            <span className={styles.overallScoreLabel}>Match</span>
          </div>
          <div className={styles.profileInfo}>
            <h3 className={styles.profileName}>{matchResult.profileName}</h3>
            <p className={styles.profileHeadline}>{matchResult.profileHeadline}</p>
          </div>
          <button className={styles.addTalentButton} onClick={onAddTalent} disabled={isLocked}>
            <AddUserIcon /> Adicionar Talento
          </button>
        </div>

        <div className={styles.categoriesList}>
          {matchResult.categories.map((category) => (
            <div key={category.name} className={styles.categoryCard}>
              <div className={styles.categoryHeader}>
                <span className={styles.categoryName}>{category.name}</span>
                <span className={styles.categoryScore}>{category.score}%</span>
              </div>
              <ScoreBar score={category.score} />
              <div className={styles.criteriaList}>
                {category.criteria.map((criterion) => (
                  <div key={criterion.name} className={styles.criterionItem}>
                    <span className={styles.criterionScore}>{criterion.score}/5</span>
                    <div className={styles.criterionDetails}>
                      <p className={styles.criterionName}>{criterion.name}</p>
                      <p className={styles.criterionJustification}>{criterion.justification}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <Header
        title="Modo Match"
        subtitle={`Analisando com: "${activeScorecard?.name || 'Nenhum Scorecard'}"`}
      />
      <div className={styles.toolbar}>
          <button onClick={onChangeScorecard} className={styles.changeButton} disabled={isLocked}>
            Trocar Scorecard
          </button>
          <button 
            onClick={onToggleLock} 
            className={`${styles.lockButton} ${isLocked ? styles.locked : ''}`}
            disabled={!matchResult} // Só pode travar se houver um resultado
          >
            {isLocked ? <UnlockIcon /> : <LockIcon />}
            {isLocked ? 'Destravar' : 'Travar Análise'}
          </button>
      </div>
      <main className={styles.content}>
        {renderContent()}
      </main>
    </div>
  );
};

export default MatchResultView;