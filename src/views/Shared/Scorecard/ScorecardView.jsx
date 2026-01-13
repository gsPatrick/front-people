import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import styles from './ScorecardView.module.css';
import { IoSparkles as FaSparkles } from 'react-icons/io5';
import { BsBoxArrowUp } from 'react-icons/bs'; // NOVO ÍCONE

// --- COMPONENTES INTERNOS ---

const RatingInput = ({ score, onChange }) => (
  <div className={styles.rating}>
    {[1, 2, 3, 4, 5].map((value) => (
      <div
        key={value}
        className={`${styles.ratingBox} ${score >= value ? styles.active : ''}`}
        onClick={() => onChange(value === score ? 0 : value)}
      />
    ))}
  </div>
);

const WeightSelectorDropdown = ({ skillId, currentWeight, isOpen, onToggle, onSelectWeight }) => {
  const weightOptions = { 1: 'Baixo', 2: 'Médio', 3: 'Alto' };
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onToggle(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle]);

  const getWeightColorClass = (weight) => {
    if (weight === 1) return styles.weightColorLow;
    if (weight === 3) return styles.weightColorHigh;
    return styles.weightColorMedium;
  };

  return (
    <div className={styles.weightSelectorContainer} ref={dropdownRef}>
      <button
        className={`${styles.weightSelectorButton} ${getWeightColorClass(currentWeight)}`}
        onClick={() => onToggle(isOpen ? null : skillId)}
        title={`Peso: ${weightOptions[currentWeight]}`}
      />
      {isOpen && (
        <div className={styles.weightSelectorDropdown}>
          {Object.entries(weightOptions).map(([value, label]) => (
            <button
              key={value}
              onClick={() => onSelectWeight(parseInt(value, 10))}
              className={styles.weightOption}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const InitializationOverlay = ({ statusText }) => (
  <div className={styles.initializationOverlay}>
    <div className={styles.loaderMedium}></div>
    <p className={styles.initializationStatusText}>{statusText}</p>
  </div>
);

// --- COMPONENTE PRINCIPAL ---

const ScorecardView = ({
  candidate,
  job,
  scorecard,
  onSubmit,
  onCancel,
  initialEvaluationData = null,
  isAIEnabled,
  onAIAssistScorecard,
  onCheckCache,
  onSyncProfile,
  onSaveWeights,
  aiAnalysisCache,
  onCacheAIResult,
  onSaveAsTemplate // <-- NOVA PROP
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [openWeightSelector, setOpenWeightSelector] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializationStatusText, setInitializationStatusText] = useState('');

  const [weights, setWeights] = useState(() => {
    const initialWeights = {};
    scorecard.skillCategories.forEach(c => {
      (c.skills || []).forEach(s => {
        initialWeights[s.id] = scorecard.weights?.[s.id] || 2;
      });
    });
    return initialWeights;
  });

  const [evaluationData, setEvaluationData] = useState(() => {
    const initialState = {
      ratings: {},
      feedback: initialEvaluationData?.feedback?.comment || '',
      notes: initialEvaluationData?.privateNotes || scorecard?.script || '',
      decision: initialEvaluationData?.feedback?.proceed || 'NO_DECISION'
    };

    // Iteramos sobre o SCORECARD (Template) para garantir que temos as chaves (ids) corretas
    scorecard.skillCategories.forEach(templateCategory => {
      // Encontra a categoria correspondente nos dados salvos (se houver)
      const savedCategory = initialEvaluationData?.skillCategories?.find(c => c.name === templateCategory.name);

      (templateCategory.skills || []).forEach(templateSkill => {
        // Encontra a skill correspondente nos dados salvos (se houver) dentro da categoria encontrada
        const savedSkill = savedCategory?.skills?.find(s => s.name === templateSkill.name);

        if (savedSkill) {
          initialState.ratings[templateSkill.id] = {
            score: savedSkill.score || 0,
            description: savedSkill.description || ''
          };
        } else {
          initialState.ratings[templateSkill.id] = {
            score: 0,
            description: ''
          };
        }
      });
    });
    return initialState;
  });

  // EFEITO DE SINCRONIA: Atualiza o estado quando initialEvaluationData muda (ex: chega do backend após a montagem)
  useEffect(() => {
    if (initialEvaluationData) {
      setEvaluationData(() => {
        const newState = {
          ratings: {},
          feedback: initialEvaluationData.feedback?.comment || '',
          notes: initialEvaluationData.privateNotes || scorecard?.script || '',
          decision: initialEvaluationData.feedback?.proceed || 'NO_DECISION'
        };

        scorecard.skillCategories.forEach(templateCategory => {
          const savedCategory = initialEvaluationData.skillCategories?.find(c => c.name === templateCategory.name);
          (templateCategory.skills || []).forEach(templateSkill => {
            const savedSkill = savedCategory?.skills?.find(s => s.name === templateSkill.name);
            if (savedSkill) {
              newState.ratings[templateSkill.id] = {
                score: savedSkill.score || 0,
                description: savedSkill.description || ''
              };
            } else {
              newState.ratings[templateSkill.id] = { score: 0, description: '' };
            }
          });
        });
        return newState;
      });
    }
  }, [initialEvaluationData, scorecard]);
  const runAIAssist = useCallback(async () => {
    if (!isAIEnabled) return;
    setIsInitializing(true);
    const cacheKey = `${candidate.id}-${scorecard.id}`;

    if (aiAnalysisCache[cacheKey]) {
      delete aiAnalysisCache[cacheKey];
    }

    setInitializationStatusText('Verificando perfil do candidato...');
    try {
      const cacheStatus = await onCheckCache();
      if (!cacheStatus.hasCache) {
        setInitializationStatusText('Perfil desatualizado. Sincronizando com o LinkedIn...');
        await onSyncProfile();
      }
      setInitializationStatusText('Analisando perfil com IA (isso pode levar alguns segundos)...');
      const result = await onAIAssistScorecard(scorecard, weights);
      if (result) {
        onCacheAIResult(cacheKey, result);
        setEvaluationData(prevData => {
          const newRatings = { ...prevData.ratings };
          result.evaluations.forEach(ev => {
            if (newRatings[ev.id] !== undefined) {
              newRatings[ev.id] = { score: ev.score, description: ev.justification };
            }
          });
          return { ...prevData, ratings: newRatings, feedback: result.overallFeedback, decision: result.finalDecision };
        });
      }
    } catch (error) {
      alert(`Ocorreu um erro com a IA: ${error.message}.`);
    } finally {
      setIsInitializing(false);
    }
  }, [isAIEnabled, candidate.id, scorecard, onCheckCache, onSyncProfile, onAIAssistScorecard, weights, onCacheAIResult, aiAnalysisCache]);

  const handleWeightChange = useCallback((skillId, newWeight) => {
    const newWeights = { ...weights, [skillId]: newWeight };
    setWeights(newWeights);
    setOpenWeightSelector(null);
  }, [weights]);

  const handleRatingChange = (skillId, newScore) => {
    setEvaluationData(prev => ({
      ...prev,
      ratings: { ...prev.ratings, [skillId]: { ...(prev.ratings[skillId] || {}), score: newScore } }
    }));
  };

  const handleRatingCommentChange = (skillId, newDescription) => {
    setEvaluationData(prev => ({
      ...prev,
      ratings: { ...prev.ratings, [skillId]: { ...(prev.ratings[skillId] || {}), description: newDescription } }
    }));
  };

  const globalScore = useMemo(() => {
    const weightMap = { 1: 1, 2: 2, 3: 3 };
    let totalWeightedScore = 0;
    let totalWeight = 0;
    Object.entries(evaluationData.ratings).forEach(([skillId, rating]) => {
      if (rating.score > 0) {
        const weightValue = weightMap[weights[skillId] || 2];
        totalWeightedScore += rating.score * weightValue;
        totalWeight += weightValue;
      }
    });
    if (totalWeight === 0) return '0.0';
    return (totalWeightedScore / totalWeight).toFixed(1);
  }, [evaluationData.ratings, weights]);

  const handleSubmit = async () => {
    setIsLoading(true);
    await onSaveWeights(scorecard.id, weights);

    // CORREÇÃO: Enviar o payload no formato "plano" que o backend (evaluationOrchestrator) espera
    const finalEvaluationData = {
      userId: 'mock-user-id',
      scorecardInterviewId: scorecard.id,
      // Backend espera strings separadas, não objeto aninhado
      feedback: evaluationData.feedback,
      decision: evaluationData.decision,
      notes: evaluationData.notes,
      // Backend espera o mapa de ratings para reconstruir a estrutura baseada no Kit
      ratings: evaluationData.ratings
    };

    await onSubmit(finalEvaluationData);
    setIsLoading(false);
  };

  return (
    <div className={styles.container}>
      {isInitializing && <InitializationOverlay statusText={initializationStatusText} />}

      <header className={styles.header}>
        <div className={styles.headerActions}>
          {isAIEnabled && (
            <button className={styles.aiButton} onClick={runAIAssist} disabled={isInitializing}>
              <FaSparkles />
              {isInitializing ? 'Analisando...' : 'Analisar com IA'}
            </button>
          )}
          {/* NOVO BOTÃO */}
          {onSaveAsTemplate && (
            <button className={styles.templateButton} onClick={() => onSaveAsTemplate(scorecard)} title="Salvar a estrutura deste scorecard como um novo modelo reutilizável.">
              <BsBoxArrowUp />
              Salvar como Modelo
            </button>
          )}
        </div>
        <div className={styles.globalScoreContainer} title={`Nota Global Ponderada: ${globalScore}`}>
          <span className={styles.globalScoreValue}>{globalScore}</span>
          <span className={styles.globalScoreLabel}>Global</span>
        </div>
      </header>

      <div className={styles.mainGrid}>
        <aside className={styles.notesPanel}>
          <label>Roteiro e Anotações da Entrevista</label>
          <textarea
            placeholder="Use este espaço para seguir o roteiro e fazer anotações..."
            value={evaluationData.notes}
            onChange={(e) => setEvaluationData(prev => ({ ...prev, notes: e.target.value }))}
          />
        </aside>
        <main className={styles.evaluationPanel}>
          <section className={styles.section}>
            {scorecard.skillCategories.map(category => (
              <div key={category.id} className={styles.category}>
                <div className={styles.categoryHeader}>
                  <h4 className={styles.categoryTitle}>{category.name}</h4>
                </div>
                {(category.skills || []).map(skill => (
                  <div key={skill.id} className={styles.skillContainer}>
                    <div className={styles.skillRow}>
                      <div className={styles.skillNameAndAI}>
                        <WeightSelectorDropdown
                          skillId={skill.id}
                          currentWeight={weights[skill.id] || 2}
                          isOpen={openWeightSelector === skill.id}
                          onToggle={setOpenWeightSelector}
                          onSelectWeight={(w) => handleWeightChange(skill.id, w)}
                        />
                        <span className={styles.skillName}>{skill.name}</span>
                      </div>
                      <RatingInput
                        score={evaluationData.ratings[skill.id]?.score || 0}
                        onChange={(score) => handleRatingChange(skill.id, score)}
                      />
                    </div>
                    {(evaluationData.ratings[skill.id]?.score > 0 || evaluationData.ratings[skill.id]?.description) && (
                      <textarea
                        className={styles.ratingCommentTextarea}
                        placeholder="Justificativa para a nota... (opcional)"
                        value={evaluationData.ratings[skill.id]?.description || ''}
                        onChange={(e) => handleRatingCommentChange(skill.id, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </section>
          <section className={styles.section}>
            <div className={styles.textareaGroup}>
              <label>Feedback Geral para o Candidato</label>
              <textarea
                rows="4"
                placeholder="Escreva suas impressões gerais..."
                value={evaluationData.feedback}
                onChange={(e) => setEvaluationData(prev => ({ ...prev, feedback: e.target.value }))}
              />
            </div>
          </section>
          <section className={styles.section}>
            <label>Decisão Final</label>
            <select
              className={styles.decisionSelect}
              value={evaluationData.decision}
              onChange={(e) => setEvaluationData(prev => ({ ...prev, decision: e.target.value }))}
            >
              <option value="NO_DECISION">Sem decisão</option>
              <option value="YES">Aprovado</option>
              <option value="NO">Reprovado</option>
            </select>
          </section>
        </main>
      </div>
      <footer className={styles.footer}>
        <button onClick={onCancel} className={styles.cancelButton}>Voltar</button>
        <button onClick={handleSubmit} className={styles.submitButton} disabled={isLoading || isInitializing}>
          {isLoading ? <span className={styles.loader}></span> : 'Salvar Avaliação'}
        </button>
      </footer>
    </div>
  );
};

export default ScorecardView;