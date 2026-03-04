import React, { useState, useEffect } from 'react';
import styles from './JobScorecardView.module.css';
import Header from '../../components/Header/Header';
import { BsChevronRight, BsPencilSquare, BsPlusCircle } from 'react-icons/bs';
import * as api from '../../services/api.service';

const JobScorecardView = ({ job, onBack, onEditScorecard, onCreateScorecard }) => {
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
          subtitle="Carregando..."
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
          <div className={styles.metaLeft}>
            <span className={`${styles.sourceBadge} ${source === 'INHIRE' ? styles.sourceCloud : styles.sourceLocal}`}>
              {source === 'INHIRE' ? 'InHire' : 'Local'}
            </span>
            <span className={styles.metaInfo}>{categories.length} {categories.length === 1 ? 'categoria' : 'categorias'}</span>
          </div>
          <button
            className={styles.editButton}
            onClick={() => onEditScorecard && onEditScorecard(sc)}
            title="Editar este scorecard"
          >
            <BsPencilSquare /> Editar
          </button>
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
                        {crit.weightType === 'priority' && (
                          <span className={styles.priorityBadge} title="Nota deste critério vale o dobro">2x</span>
                        )}
                        {crit.weightType === 'essential' && (
                          <span className={styles.essentialBadge} title={`Imprescindível: ${crit.tag || ''}`}>
                            {crit.tag || 'Imprescindível'}
                          </span>
                        )}
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
            <p className={styles.emptyHint}>Crie um scorecard para esta vaga com os critérios de avaliação.</p>
            {onCreateScorecard && (
              <button className={styles.createButton} onClick={() => onCreateScorecard(job)}>
                <BsPlusCircle /> Criar Scorecard
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default JobScorecardView;
