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

    // Estado da Configuração de Sourcing
    const [showSourceConfig, setShowSourceConfig] = useState(false);
    const [sourceTargetCount, setSourceTargetCount] = useState(50);

    useEffect(() => {
        const checkCurrentTab = () => {
            if (chrome?.tabs) {
                chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
                    const url = tabs[0]?.url || '';
                    if (url) {
                        console.log("[BatchQueueView] Detected URL:", url);
                        setCurrentTabUrl(url);

                        // Auto-open config if on search page
                        if (url.includes('linkedin.com/search/results/people')) {
                            setShowSourceConfig(true);
                        }
                    }
                });
            }
        };

        // Check on mount
        checkCurrentTab();

        // Check on updates (navigation)
        const handleUpdate = (tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.active) {
                checkCurrentTab();
            }
        };

        // Check on tab switch
        const handleActivated = (activeInfo) => {
            checkCurrentTab();
        };

        if (chrome?.tabs) {
            chrome.tabs.onUpdated.addListener(handleUpdate);
            chrome.tabs.onActivated.addListener(handleActivated);
        }

        return () => {
            if (chrome?.tabs) {
                chrome.tabs.onUpdated.removeListener(handleUpdate);
                chrome.tabs.onActivated.removeListener(handleActivated);
            }
        };
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
        // Find next unprocessed index or just increment if we are navigating history
        // Since we are using filtered view, maybe we just want to skip?
        // Actually, "Next" behavior for Tinder-like is usually "Skip/Reject" or just move card.
        // But if this is for the "Previous" arrow functionality:
        /*
        if (reviewIndex < validResults.length - 1) {
            setReviewIndex(reviewIndex + 1);
        }
        */
        // Implementação simplificada pois o fluxo principal remove da lista via processedIds
    };

    const handlePrevReview = () => {
        // Lógica para desfazer a última ação?
        // Se quisermos apenas navegar entre os processados, precisaríamos de um histórico.
        // Se o erro é "handlePrevReview is not defined", significa que o botão está chamando isso.

        // Vamos apenas definir a função para evitar o crash, 
        // mas idealmente deveríamos implementar "Desfazer".
        // Por enquanto, alertar que não é possível voltar ou implementar um undo simples.

        const lastProcessed = Array.from(processedIds).pop();
        if (lastProcessed) {
            const newProcessed = new Set(processedIds);
            newProcessed.delete(lastProcessed);
            setProcessedIds(newProcessed);
        }
    };

    // Modal de Configuração de Sourcing (PRIORIDADE MÁXIMA)
    if (showSourceConfig) {
        return (
            <div className={styles.container}>
                <Header
                    title="Configurar Busca"
                    subtitle="Defina os parâmetros da automação"
                    onBack={() => setShowSourceConfig(false)}
                />
                <main className={styles.content} style={{ padding: '20px' }}>
                    <div style={{ background: '#f0f9ff', padding: '15px', borderRadius: '8px', border: '1px solid #bae6fd', marginBottom: '20px' }}>
                        <h3 style={{ color: '#0369a1', margin: '0 0 8px 0', fontSize: '14px' }}>ℹ️ Como funciona?</h3>
                        <p style={{ fontSize: '12px', color: '#334155', lineHeight: '1.5' }}>
                            1. O sistema usará a busca <strong>já aberta no LinkedIn</strong>.<br />
                            2. Certifique-se de aplicar todos os <strong>filtros desejados</strong> (Cargo, Localização, etc) na página do LinkedIn antes de iniciar.<br />
                            3. O robô irá percorrer as páginas automaticamente até atingir a meta.
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#334155' }}>
                            Quantos perfis deseja capturar?
                        </label>
                        <select
                            value={sourceTargetCount}
                            onChange={(e) => setSourceTargetCount(Number(e.target.value))}
                            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                        >
                            <option value={10}>10 perfis (Rápido)</option>
                            <option value={25}>25 perfis</option>
                            <option value={50}>50 perfis (Padrão)</option>
                            <option value={100}>100 perfis</option>
                            <option value={150}>150 perfis (Máximo recomendado)</option>
                        </select>

                        <button
                            onClick={() => {
                                setShowSourceConfig(false);
                                onAutoSource(currentTabUrl, scorecard?.id, sourceTargetCount);
                            }}
                            style={{
                                background: '#7e22ce',
                                color: 'white',
                                padding: '14px',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                cursor: 'pointer',
                                marginTop: '10px'
                            }}
                        >
                            🚀 Iniciar Busca Automática
                        </button>
                    </div>
                </main>
            </div>
        );
    }

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

                        {totalTabs > 0 && (
                            <button onClick={onStartQueue} className={styles.startButton}>
                                <BsPlayFill /> Iniciar Fila
                            </button>
                        )}

                        {/* BOTÃO DE AUTOMAÇÃO DE BUSCA INTELIGENTE (Sempre visível ou abaixo do iniciar) */}
                        <button
                            className={styles.sourceButton}
                            onClick={() => {
                                const isSearchPage = currentTabUrl && currentTabUrl.includes('linkedin.com/search/results/people');
                                if (isSearchPage) {
                                    // Abre modal de configuração
                                    setShowSourceConfig(true);
                                } else {
                                    // Abre nova aba de busca para o usuário
                                    if (chrome?.tabs) {
                                        chrome.tabs.create({ url: 'https://www.linkedin.com/search/results/people/' });
                                    } else {
                                        window.open('https://www.linkedin.com/search/results/people/', '_blank');
                                    }
                                }
                            }}
                            style={{
                                marginTop: '15px',
                                backgroundColor: (currentTabUrl && currentTabUrl.includes('linkedin.com/search/results/people')) ? '#059669' : '#7e22ce', // Verde ou Roxo
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
                                ? '📥 Importar Desta Busca'
                                : '🔍 Ir para Busca de Pessoas'}
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
