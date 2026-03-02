import React from 'react';
import styles from '../../views/Match/MatchResultView.module.css'; // Reusing existing styles for consistency

const TalentMatchDisplay = ({ matchData }) => {
    if (!matchData) return <div className={styles.emptyState}>Nenhuma avaliação de IA disponível.</div>;

    // Adapter to handle both frontend direct result and saved DB structure
    const result = matchData.aiReview || matchData;
    const overallScore = matchData.matchScore || result.overallScore || 0;

    return (
        <div className={styles.resultsContainer} style={{ animation: 'none', padding: '0' }}>
            <div className={styles.summaryHeader} style={{ marginBottom: '16px', paddingBottom: '16px' }}>
                <div className={styles.overallScoreWrapper}>
                    <span className={styles.overallScore}>{overallScore}%</span>
                    <span className={styles.overallScoreLabel}>Match IA</span>
                </div>
                <div className={styles.profileInfo}>
                    <h4 style={{ margin: '0 0 4px', color: '#1e293b' }}>Resumo da Avaliação</h4>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {/* Strengths / Weaknesses summary if available in aiReview */}
                        {result.strengths && result.strengths.length > 0 && (
                            <span style={{ fontSize: '12px', color: '#166534', backgroundColor: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>
                                {result.strengths.length} Pontos Fortes
                            </span>
                        )}
                        {result.weaknesses && result.weaknesses.length > 0 && (
                            <span style={{ fontSize: '12px', color: '#991b1b', backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
                                {result.weaknesses.length} Pontos de Atenção
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className={styles.categoriesList}>
                {(result.categories || []).map((category, idx) => (
                    <div key={idx} className={styles.categoryCard}>
                        <div className={styles.categoryHeader}>
                            <span className={styles.categoryName}>{category.name}</span>
                            <span className={styles.categoryScore}>{category.score || category.averageScore}%</span>
                        </div>

                        {/* Score Bar */}
                        <div className={styles.scoreBarContainer}>
                            <div className={styles.scoreBarFill} style={{ width: `${category.score || category.averageScore}%` }} />
                        </div>

                        <div className={styles.criteriaList}>
                            {(category.criteria || []).map((criterion, cIdx) => (
                                <div key={cIdx} className={styles.criterionItem}>
                                    <div className={styles.criterionMain}>
                                        <span className={styles.criterionScore}>{criterion.score}/5</span>
                                        <span className={styles.criterionName}>{criterion.name}</span>
                                    </div>
                                    <p className={styles.criterionJustification}>{criterion.justification}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TalentMatchDisplay;
