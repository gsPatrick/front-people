import React, { useState, useEffect } from 'react';
import styles from './JobScorecardView.module.css';
import Header from '../../components/Header/Header';
import { BsChevronRight } from 'react-icons/bs';
import * as api from '../../services/api.service';

const JobScorecardView = ({ job, onBack }) => {
  const [scorecardData, setScorecardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (job?.id) {
      setIsLoading(true);
      api.fetchScorecardForJob(job.id)
        .then(data => setScorecardData(data))
        .catch(() => setScorecardData({ scorecard: null, message: 'Erro ao carregar scorecard.' }))
        .finally(() => setIsLoading(false));
    }
  }, [job?.id]);
  if (isLoading) {
    return (
      <div className={styles.container}>
        <Header
          title="Scorecard"
          subtitle={`Carregando...`}
          onBack={onBack}
        />
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Buscando scorecard da vaga...</p>
        </div>
      </div>
    );
  }

  const hasScorecard = scorecardData && scorecardData.scorecard;
  const sc = scorecardData?.scorecard;
  const source = scorecardData?.source;
  const categories = sc?.categories || sc?.skillCategories || [];

  return (
    <div className={styles.container}>
      <Header
        title={hasScorecard ? (sc.name || 'Scorecard') : 'Scorecard'}
        subtitle={hasScorecard ? `Vaga: ${job?.name || job?.title || 'Sem nome'}` : 'Nenhum scorecard encontrado'}
        onBack={onBack}
      />

      {hasScorecard && (
        <div className={styles.metaBar}>
          <span className={`${styles.sourceBadge} ${source === 'INHIRE' ? styles.sourceCloud : styles.sourceLocal}`}>
            {source === 'INHIRE' ? 'InHire' : 'Local'}
          </span>
          <span className={styles.metaInfo}>{categories.length} {categories.length === 1 ? 'categoria' : 'categorias'}</span>
        </div>
      )}

      <main className={styles.content}>
        {hasScorecard ? (
          categories.length > 0 ? (
            categories.map((cat, catIdx) => {
              const criteria = cat.criteria || cat.skills || [];
              return (
                <div key={catIdx} className={styles.categoryCard}>
                  <h3 className={styles.categoryName}>{cat.name}</h3>
                  <ul className={styles.criteriaList}>
                    {criteria.map((crit, critIdx) => (
                      <li key={critIdx} className={styles.criterionItem}>
                        <BsChevronRight className={styles.criterionIcon} />
                        <span>{crit.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          ) : (
            <div className={styles.emptyState}>
              <p>Este scorecard não possui categorias definidas.</p>
            </div>
          )
        ) : (
          <div className={styles.emptyState}>
            <p>{scorecardData?.message || 'Nenhum scorecard vinculado a esta vaga.'}</p>
            <p className={styles.emptyHint}>Você pode criar um scorecard na aba de Scorecards e vincular a esta vaga.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default JobScorecardView;
