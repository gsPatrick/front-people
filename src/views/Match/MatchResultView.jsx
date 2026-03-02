// SUBSTITUA O ARQUIVO: src/views/Match/MatchResultView.jsx

import React from 'react';
import styles from './MatchResultView.module.css';
import Header from '../../components/Header/Header';

// Ícones Profissionais (SVG)
const UploadIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>);
const AddUserIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="23" y1="11" x2="23" y2="17" /><line x1="20" y1="14" x2="26" y2="14" /></svg>);
const LockIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>);
const UnlockIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>);
const StarIcon = ({ filled }) => (
  <svg
    className={`${styles.star} ${filled ? styles.starFilled : styles.starEmpty}`}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const LoadingSpinner = () => <div className={styles.loadingSpinner}></div>;

// Componente de Estrelas (1-5)
const StarRating = ({ rating }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(<StarIcon key={i} filled={i <= rating} />);
  }
  return <div className={styles.starRating}>{stars}</div>;
};

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
          <p className={styles.stateText}>Analisando perfil... A inteligência artificial está processando os dados.</p>
        </div>
      );
    }

    if (!matchResult) {
      return (
        <div className={styles.stateContainer}>
          <div className={styles.welcomeIcon}><UploadIcon /></div>
          <h3 className={styles.welcomeTitle}>Aguardando Perfil</h3>
          <p className={styles.stateText}>
            Arraste e solte o currículo (PDF) do LinkedIn aqui para iniciar a análise comparativa.
          </p>
        </div>
      );
    }

    return (
      <div className={styles.resultsContainer}>
        {/* Card Principal: Resumo Geral */}
        <div className={styles.summaryCard}>
          <div className={styles.scoreCircle}>
            <span className={styles.scoreValue}>{matchResult.overallScore}%</span>
            <span className={styles.scoreLabel}>Match</span>
          </div>
          <div className={styles.profileInfo}>
            <h3 className={styles.profileName}>{matchResult.profileName}</h3>
            <p className={styles.profileHeadline}>{matchResult.profileHeadline}</p>
          </div>
          <button className={styles.addTalentButton} onClick={onAddTalent} disabled={isLocked}>
            <AddUserIcon /> Adicionar Talento
          </button>
        </div>

        {/* Listagem de Categorias e Critérios (Cards Individuais) */}
        {matchResult.categories.map((category) => (
          <section key={category.name} className={styles.categorySection}>
            <h4 className={styles.categoryTitle}>{category.name}</h4>
            {category.criteria.map((criterion, idx) => (
              <div key={idx} className={styles.criterionCard}>
                <div className={styles.criterionHeader}>
                  <span className={styles.criterionName}>{criterion.name}</span>
                  <StarRating rating={criterion.score} />
                </div>
                <p className={styles.criterionJustification}>
                  {criterion.justification}
                </p>
              </div>
            ))}
          </section>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <Header
        title="Análise de Match"
        subtitle={`Modelo: ${activeScorecard?.name || 'Não selecionado'}`}
      />
      <div className={styles.toolbar}>
        <button onClick={onChangeScorecard} className={styles.changeButton} disabled={isLocked}>
          Trocar Modelo
        </button>
        <button
          onClick={onToggleLock}
          className={`${styles.lockButton} ${isLocked ? styles.locked : ''}`}
          disabled={!matchResult}
        >
          {isLocked ? <UnlockIcon /> : <LockIcon />}
          {isLocked ? 'Destravar' : 'Travar Página'}
        </button>
      </div>
      <main className={styles.content}>
        {renderContent()}
      </main>
    </div>
  );
};

export default MatchResultView;