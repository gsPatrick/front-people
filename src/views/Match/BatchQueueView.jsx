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

    // Estado de Ordenação
    const [sortBy, setSortBy] = useState('score'); // 'score' | 'date'
    const [currentTabUrl, setCurrentTabUrl] = useState('');

    useEffect(() => {
        if (chrome?.tabs) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]?.url) setCurrentTabUrl(tabs[0].url);
            });
        }
    }, []);

    // Lógica de Ordenação
    const sortedResults = [...validResults].sort((a, b) => {
        if (sortBy === 'score') {
            return (b.averageScore || 0) - (a.averageScore || 0); // Decrescente
        }
        return 0;
    });

    const [processedIds, setProcessedIds] = useState(new Set());

    // Encontra o primeiro item da lista ordenada que AINDA NÃO FOI processado
    const currentReview = sortedResults.find(r => !processedIds.has(r.username));

    // Totais para UI
    const processedCount = processedIds.size;
    const remainingCount = sortedResults.length - processedCount;

    const handleAccept = () => {
        if (currentReview) {
            setProcessedIds(prev => new Set([...prev, currentReview.username]));
            onAcceptProfile(currentReview);
        }
    };

    const handleReject = () => {
        if (currentReview) {
            setProcessedIds(prev => new Set([...prev, currentReview.username]));
            onRejectProfile(currentReview);
            // Não precisamos de findNext, pois o sortedResults.find já pega o próximo
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
                                {/* BOTÃO DE AUTOMAÇÃO DE BUSCA INTELIGENTE */}
                                <button
                                    className={styles.sourceButton}
                                    onClick={() => {
                                        const isSearchPage = currentTabUrl && currentTabUrl.includes('linkedin.com/search/results/people');
                                        if (isSearchPage) {
                                            // Usa a aba atual direto!
                                            onAutoSource(currentTabUrl, scorecard?.id);
                                        } else {
                                            // Pede URL
                                            const url = prompt("Cole a URL da busca do LinkedIn (ex: linkedin.com/search/results/people/...)");
                                            if (url) onAutoSource(url, scorecard?.id);
                                        }
                                    }}
                                    style={{
                                        marginTop: '15px',
                                        backgroundColor: (currentTabUrl && currentTabUrl.includes('linkedin.com/search/results/people')) ? '#059669' : '#7e22ce',
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
                                    {(currentTabUrl && currentTabUrl.includes('linkedin.com/search/results/people'))
                                        ? '📥 Importar Desta Busca (Atual)'
                                        : '🔍 Buscar +50 Perfis Automaticamente'}
                                </button>   </div>
                        )}
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
    // Fila terminou - mostrar review
    // Se todos foram processados (aceitos/rejeitados), mostrar resumo final
    if (remainingCount === 0 && validResults.length > 0) {
        return (
            <div className={styles.container}>
                <Header
                    title="Revisão Concluída"
                    subtitle={`${processedCount} perfis revisados`}
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
                subtitle={`${remainingCount} restantes de ${validResults.length}`}
            />
            {/* BARRA DE ORDENAÇÃO */}
            <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>ORDENAR POR:</span>
                <div style={{ display: 'flex', gap: '5px' }}>
                    <button
                        onClick={() => setSortBy('score')}
                        style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: sortBy === 'score' ? '#6b21a8' : 'white',
                            color: sortBy === 'score' ? 'white' : '#64748b',
                            cursor: 'pointer'
                        }}
                    >
                        🏆 Melhor Match
                    </button>
                    <button
                        onClick={() => setSortBy('date')}
                        style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: sortBy === 'date' ? '#6b21a8' : 'white',
                            color: sortBy === 'date' ? 'white' : '#64748b',
                            cursor: 'pointer'
                        }}
                    >
                        🕒 Recentes
                    </button>
                </div>
            </div>

            <main className={styles.content}>
                {currentReview ? (
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
