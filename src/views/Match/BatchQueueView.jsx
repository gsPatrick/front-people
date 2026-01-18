// src/views/Match/BatchQueueView.jsx
import React, { useState, useEffect } from 'react';
import styles from './BatchQueueView.module.css';
import Header from '../../components/Header/Header';
import { BsPlayFill, BsStopFill, BsCheckCircleFill, BsXCircleFill, BsArrowRepeat, BsStarFill, BsStar } from 'react-icons/bs';

// Componente de estrelas
const StarRating = ({ score, maxScore = 5 }) => {
    const stars = [];
    for (let i = 1; i <= maxScore; i++) {
        stars.push(
            i <= score ? (
                <BsStarFill key={i} className={styles.starFilled} />
            ) : (
                <BsStar key={i} className={styles.starEmpty} />
            )
        );
    }
    return <div className={styles.starsContainer}>{stars}</div>;
};

const BatchQueueView = ({
    scorecard,
    queueState,
    onStartQueue,
    onStopQueue,
    onAcceptProfile,
    onRejectProfile,
    onGoBack,
    onAutoSource // Nova prop
}) => {
    const { isRunning, tabs, currentIndex, results } = queueState;
    const totalTabs = tabs.length;
    const processed = results.length;
    const progress = totalTabs > 0 ? (processed / totalTabs) * 100 : 0;

    // Filtrar apenas resultados válidos (sem erro)
    const validResults = results.filter(r => !r.error);

    // Índice do resultado sendo visualizado no review
    const [reviewIndex, setReviewIndex] = useState(0);

    // Lista de índices já processados (aceitos ou rejeitados)
    const [processedIndices, setProcessedIndices] = useState(new Set());

    // Encontra o próximo resultado não processado
    const findNextUnprocessed = (startIndex) => {
        for (let i = startIndex; i < validResults.length; i++) {
            if (!processedIndices.has(i)) {
                return i;
            }
        }
        // Se não achou pra frente, procura do início
        for (let i = 0; i < startIndex; i++) {
            if (!processedIndices.has(i)) {
                return i;
            }
        }
        return -1; // Todos processados
    };

    const currentReview = validResults[reviewIndex];
    const remainingToProcess = validResults.length - processedIndices.size;

    const handleAccept = () => {
        if (currentReview) {
            // Marca como processado
            setProcessedIndices(prev => new Set([...prev, reviewIndex]));
            // Chama callback (isso vai abrir seleção de vaga)
            onAcceptProfile(currentReview);
        }
    };

    const handleReject = () => {
        if (currentReview) {
            // Marca como processado
            const newProcessed = new Set([...processedIndices, reviewIndex]);
            setProcessedIndices(newProcessed);
            onRejectProfile(currentReview);

            // Avança para o próximo não processado
            const next = findNextUnprocessedAfter(reviewIndex, newProcessed);
            setReviewIndex(next !== -1 ? next : 0);
        }
    };

    const findNextUnprocessedAfter = (currentIdx, processedSet) => {
        for (let i = currentIdx + 1; i < validResults.length; i++) {
            if (!processedSet.has(i)) return i;
        }
        for (let i = 0; i < currentIdx; i++) {
            if (!processedSet.has(i)) return i;
        }
        return -1;
    };

    const handlePrevReview = () => {
        if (reviewIndex > 0) {
            setReviewIndex(reviewIndex - 1);
        }
    };

    const handleNextReview = () => {
        if (reviewIndex < validResults.length - 1) {
            setReviewIndex(reviewIndex + 1);
        }
    };

    // Se não há resultados e fila parada, mostrar tela de detecção
    if (!isRunning && results.length === 0) {
        return (
            <div className={styles.container}>
                <Header
                    title="Fila em Lote"
                    subtitle={`Scorecard: ${scorecard?.name || 'Não selecionado'}`}
                    onBack={onGoBack}
                />
                <main className={styles.content}>
                    <div className={styles.detectionSection}>
                        <h2>Abas LinkedIn Detectadas</h2>
                        <p className={styles.tabCount}>{totalTabs} perfis encontrados</p>

                        <div className={styles.tabList}>
                            {tabs.slice(0, 10).map((tab, idx) => (
                                <div key={tab.id} className={styles.tabItem}>
                                    <span className={styles.tabIndex}>{idx + 1}</span>
                                    <span className={styles.tabUrl}>{tab.username || tab.url}</span>
                                </div>
                            ))}
                            {tabs.length > 10 && (
                                <p className={styles.moreItems}>...e mais {tabs.length - 10} perfis</p>
                            )}
                        </div>

                        {totalTabs > 0 ? (
                            <button onClick={onStartQueue} className={styles.startButton}>
                                <BsPlayFill /> Iniciar Fila
                            </button>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', width: '100%' }}>
                                <p className={styles.noTabs} style={{ textAlign: 'center' }}>
                                    Nenhuma aba encontrada.<br />Abra perfis manualmente ou faça uma busca automática.
                                </p>
                            </div>
                        )}

                        {/* BOTÃO DE AUTOMAÇÃO DE BUSCA */}
                        <button
                            className={styles.sourceButton}
                            onClick={() => {
                                const url = prompt("Cole a URL da busca do LinkedIn (ex: linkedin.com/search/results/people/...)");
                                if (url) onAutoSource(url);
                            }}
                            style={{
                                marginTop: '15px',
                                backgroundColor: '#7e22ce',
                                color: 'white',
                                border: 'none',
                                padding: '12px 20px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: 'bold',
                                width: '100%',
                                justifyContent: 'center'
                            }}
                        >
                            🔍 Buscar +50 Perfis Automaticamente
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    // Se a fila está rodando, mostrar progresso
    if (isRunning) {
        return (
            <div className={styles.container}>
                <Header
                    title="Processando Fila"
                    subtitle={`${processed}/${totalTabs} perfis processados`}
                />
                <main className={styles.content}>
                    <div className={styles.progressSection}>
                        <div className={styles.progressBar}>
                            <div
                                className={styles.progressFill}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className={styles.progressText}>
                            {Math.round(progress)}% concluído
                        </p>

                        <div className={styles.currentProcessing}>
                            {tabs[currentIndex] && (
                                <>
                                    <BsArrowRepeat className={styles.spinIcon} />
                                    <span>Processando: {tabs[currentIndex].username}</span>
                                </>
                            )}
                        </div>

                        <div className={styles.resultsList}>
                            {results.slice().reverse().slice(0, 5).map((result, idx) => (
                                <div key={idx} className={`${styles.resultItem} ${result.error ? styles.error : ''}`}>
                                    {result.error ? (
                                        <BsXCircleFill className={styles.errorIcon} />
                                    ) : (
                                        <BsCheckCircleFill className={styles.successIcon} />
                                    )}
                                    <span className={styles.resultName}>{result.name || result.username}</span>
                                    {!result.error && (
                                        <span className={styles.resultScore}>
                                            {result.averageScore?.toFixed(1) || '-'}/5
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button onClick={onStopQueue} className={styles.stopButton}>
                            <BsStopFill /> Parar Fila
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    // Fila terminou - mostrar review
    // Se todos foram processados (aceitos/rejeitados), mostrar resumo final
    if (remainingToProcess === 0 && validResults.length > 0) {
        return (
            <div className={styles.container}>
                <Header
                    title="Revisão Concluída"
                    subtitle={`${processedIndices.size} perfis revisados`}
                />
                <main className={styles.content}>
                    <div className={styles.completedSection}>
                        <BsCheckCircleFill className={styles.completedIcon} />
                        <h2>Todos os perfis foram revisados!</h2>
                        <p>{validResults.length} perfis processados</p>
                        <button onClick={onGoBack} className={styles.backButton}>
                            Voltar ao Menu
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    // Mostra review estilo Tinder
    return (
        <div className={styles.container}>
            <Header
                title="Revisar Perfis"
                subtitle={`${remainingToProcess} restantes de ${validResults.length}`}
            />
            <main className={styles.content}>
                {currentReview && !processedIndices.has(reviewIndex) ? (
                    <div className={styles.reviewCard}>
                        <div className={styles.reviewHeader}>
                            <h2 className={styles.reviewName}>{currentReview.username || currentReview.name}</h2>
                            <div className={styles.scoreSection}>
                                <span className={styles.reviewScore}>
                                    {currentReview.matchResult?.overallScore
                                        ? (currentReview.matchResult.overallScore / 10).toFixed(1)
                                        : '-'}/10
                                </span>
                                <StarRating score={Math.round((currentReview.matchResult?.overallScore || 0) / 20)} />
                            </div>
                        </div>

                        <div className={styles.reviewDetails}>
                            <p className={styles.reviewTitle}>{currentReview.headline}</p>

                            <div className={styles.criteriaList}>
                                {currentReview.matchResult?.categories?.flatMap((category, catIdx) =>
                                    category.criteria?.map((crit, critIdx) => (
                                        <div key={`${catIdx}-${critIdx}`} className={styles.criterionCard}>
                                            <div className={styles.criterionHeader}>
                                                <span className={styles.criterionName}>{crit.name}</span>
                                                <StarRating score={crit.score || 0} />
                                            </div>
                                            <p className={styles.criterionJustification}>
                                                {crit.justification || 'Sem avaliação disponível'}
                                            </p>
                                        </div>
                                    ))
                                ) || (
                                        <p className={styles.noCriteria}>Nenhum critério avaliado</p>
                                    )}
                            </div>
                        </div>

                        <div className={styles.reviewActions}>
                            <button onClick={handleReject} className={styles.rejectButton}>
                                <BsXCircleFill /> Rejeitar
                            </button>
                            <button onClick={handleAccept} className={styles.acceptButton}>
                                <BsCheckCircleFill /> Aceitar
                            </button>
                        </div>

                        <div className={styles.reviewNav}>
                            <button
                                onClick={handlePrevReview}
                                disabled={reviewIndex === 0}
                                className={styles.navButton}
                            >
                                ← Anterior
                            </button>
                            <span className={styles.navCounter}>{reviewIndex + 1}/{validResults.length}</span>
                            <button
                                onClick={handleNextReview}
                                disabled={reviewIndex >= validResults.length - 1}
                                className={styles.navButton}
                            >
                                Próximo →
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className={styles.skippedCard}>
                        <p>Este perfil já foi processado</p>
                        <div className={styles.reviewNav}>
                            <button onClick={handlePrevReview} disabled={reviewIndex === 0} className={styles.navButton}>
                                ← Anterior
                            </button>
                            <button onClick={handleNextReview} disabled={reviewIndex >= validResults.length - 1} className={styles.navButton}>
                                Próximo →
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default BatchQueueView;
