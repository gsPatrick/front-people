import React from 'react';
import styles from './HistoricalScorecard.module.css';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle } from 'react-icons/fa';

const HistoricalScorecard = ({ evaluationResult }) => {
  if (!evaluationResult) return null;

  const { score, categories, jobName, evaluatedAt, essentialFailed, essentialCriterion } = evaluationResult;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={styles.scorecardContainer}>
      <div className={styles.scorecardHeader}>
        <div className={styles.headerMain}>
          <h4 className={styles.jobTitle}>{jobName}</h4>
          <span className={styles.date}>{formatDate(evaluatedAt)}</span>
        </div>
        <div className={styles.scoreBadge} data-score={score}>
          <span className={styles.scoreValue}>{Math.round(score)}%</span>
        </div>
      </div>

      {essentialFailed && (
        <div className={styles.essentialAlert}>
          <FaExclamationCircle />
          <span>
            Reprovado em Critério Imprescindível: <strong>{essentialCriterion}</strong>
          </span>
        </div>
      )}

      <div className={styles.categories}>
        {categories.map((cat, idx) => (
          <div key={idx} className={styles.category}>
            <h5 className={styles.categoryName}>{cat.name}</h5>
            <div className={styles.criteria}>
              {cat.criteria.map((crit, cIdx) => (
                <div key={cIdx} className={styles.criterionRow}>
                  <div className={styles.criterionInfo}>
                    <span className={styles.criterionName}>{crit.name}</span>
                    {crit.weightType === 'priority' && <span className={styles.priorityBadge}>2x</span>}
                    {crit.weightType === 'essential' && <span className={styles.essentialBadge}>Imprescindível</span>}
                    {crit.justification && (
                       <div className={styles.justification}>
                         <FaInfoCircle /> {crit.justification}
                       </div>
                    )}
                  </div>
                  <div className={styles.ratingBar}>
                    <div 
                      className={styles.ratingFill} 
                      style={{ width: `${crit.score}%` }}
                    ></div>
                    <span className={styles.scoreText}>{crit.score}%</span>
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

export default HistoricalScorecard;
