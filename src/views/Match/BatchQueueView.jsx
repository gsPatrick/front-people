import React, { useState, useEffect } from 'react';
import styles from './BatchQueue.module.css';
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
    // Estado de Ordenação REMOVED
    // const [sortBy, setSortBy] = useState('score');  <-- Removed
    const [currentTabUrl, setCurrentTabUrl] = useState('');

    // Estado da Configuração de Sourcing
    const [showSourceConfig, setShowSourceConfig] = useState(false);
    const [sourceTargetCount, setSourceTargetCount] = useState(50);
    const [isSourcing, setIsSourcing] = useState(false);

    useEffect(() => {
        const checkCurrentTab = () => {
            if (chrome?.tabs) {
                chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
                    const url = tabs[0]?.url || '';
                    if (url) {
                        console.log("[BatchQueueView] Detected URL:", url);
                        setCurrentTabUrl(url);

                        // Auto-open config if on search page AND NOT sourcing/running
                        if (url.includes('linkedin.com/search/results/people') && !isSourcing && !isRunning) {
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
    }, [isSourcing, isRunning]); // Dependência isSourcing adicionada

    // Forçar Ordenação por Score (Melhor Match) - Pedido do Usuário
    const sortedResults = [...validResults].sort((a, b) => {
        return (b.averageScore || 0) - (a.averageScore || 0); // Decrescente
    });

    const [processedIds, setProcessedIds] = useState(new Set());

    // Encontra o primeiro item da lista ordenada que AINDA NÃO FOI processado
    const currentReview = sortedResults.find(r => !processedIds.has(r.username));

    // Efeito: Abrir/Focar aba do LinkedIn do perfil atual automaticamente
    useEffect(() => {
        if (currentReview && currentReview.tabId && chrome?.tabs) {
            chrome.tabs.update(currentReview.tabId, { active: true }).catch(err => {
                console.log("Erro ao focar aba (pode ter sido fechada):", err);
                // Se falhar pelo ID, tentar abrir nova URL? O usuário pediu abrir.
                // Mas geralmente a aba já existe na fila. Se não existir, talvez melhor não abrir spam de abas.
                if (currentReview.url) {
                    // Opcional: recriar aba se nao existir. Por enquanto focar no update.
                }
            });
        }
    }, [currentReview]);

    // Totais para UI
    const processedCount = processedIds.size;
    const remainingCount = sortedResults.length - processedCount;

    const handleAccept = () => {
        if (currentReview) {
            setProcessedIds(prev => new Set([...prev, currentReview.username]));
            onAcceptProfile(currentReview);
            // Close tab after decision (User request: "close the page")
            if (currentReview.tabId && chrome?.tabs) {
                chrome.tabs.remove(currentReview.tabId).catch(() => { });
            }
        }
    };

    const handleReject = () => {
        if (currentReview) {
            setProcessedIds(prev => new Set([...prev, currentReview.username]));
            onRejectProfile(currentReview);
            // Close tab after decision
            if (currentReview.tabId && chrome?.tabs) {
                chrome.tabs.remove(currentReview.tabId).catch(() => { });
            }
        }
    };

    const handleNextReview = () => {
        // Sem ação explícita de "pular" estilo botão, mas a função existe se precisarmos
    };

    const handlePrevReview = () => {
        const lastProcessed = Array.from(processedIds).pop();
        if (lastProcessed) {
            const newProcessed = new Set(processedIds);
            newProcessed.delete(lastProcessed);
            setProcessedIds(newProcessed);
        }
    };

    // UI de Sourcing (Feedback Visual) - BLOQUEANTE
    if (isSourcing) {
        return (
            <div className={styles.container}>
                <Header title="Buscando Perfis..." subtitle="O robô está trabalhando" />
                <main className={styles.content} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '20px' }}>
                    <div className={styles.loadingSpinner}></div>
                    <div style={{ textAlign: 'center', color: '#64748b' }}>
                        <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>Navegando e coletando...</p>
                        <p style={{ fontSize: '12px' }}>Isso pode levar alguns segundos.</p>
                        <p style={{ fontSize: '12px' }}>Não mexa no mouse.</p>
                    </div>
                </main>
            </div>
        );
    }

    // Modal de Configuração de Sourcing
    // Só mostra se não estiver rodando nem sourcing
    if (showSourceConfig && !isSourcing && !isRunning) {
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
                            onClick={async () => {
                                setShowSourceConfig(false);
                                setIsSourcing(true); // START LOADING
                                try {
                                    await onAutoSource(currentTabUrl, scorecard?.id, sourceTargetCount);
                                    // A fila deve iniciar automaticamente
                                    setIsSourcing(false);
                                } catch (error) {
                                    alert("Erro ao iniciar busca: " + error.message);
                                    setIsSourcing(false);
                                    setShowSourceConfig(true);
                                }
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
                        <button
                            className={styles.sourceButton}
                            onClick={() => {
                                const isSearchPage = currentTabUrl && currentTabUrl.includes('linkedin.com/search/results/people');
                                if (isSearchPage) {
                                    setShowSourceConfig(true);
                                } else {
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
            {/* SEM BARRA DE ORDENAÇÃO: Ordenação por melhor match é mandatória */}

            <main className={styles.content} style={{ padding: '15px' }}>
                {currentReview ? (
                    <div className={styles.reviewCard}>
                        {/* Headers e Score */}
                        <div className={styles.cardHeader}>
                            <div className={styles.avatarPlaceholder}>
                                {currentReview.name ? currentReview.name.charAt(0) : '?'}
                            </div>
                            <div className={styles.info}>
                                {/* User Request: Show username from URL (after /in/) */}
                                <h3>{currentReview.username
                                    ? currentReview.username.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
                                    : (currentReview.name || 'Candidato Desconhecido')}</h3>
                                <p>{currentReview.headline || 'Perfil LinkedIn'}</p>
                            </div>
                            <div className={styles.scoreBadge} style={{ backgroundColor: currentReview.averageScore > 4 ? '#16a34a' : currentReview.averageScore > 3 ? '#eab308' : '#dc2626' }}>
                                {currentReview.averageScore?.toFixed(1) || '-'}
                            </div>
                        </div>

                        {/* Detalhes do Match */}
                        <div className={styles.matchDetails}>
                            <div className={styles.detailItem}>
                                <span className={styles.icon}>🎯</span>
                                <div>
                                    <strong>Pontos Fortes</strong>
                                    <p>{currentReview.strengths?.join(', ') || 'Nenhum identificado.'}</p>
                                </div>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.icon}>⚠️</span>
                                <div>
                                    <strong>Pontos de Atenção</strong>
                                    <p>{currentReview.weaknesses?.join(', ') || 'Nenhum identificado.'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Avaliação por Categoria Detalhada */}
                        <div className={styles.categoriesReview}>
                            <h4 className={styles.sectionTitle}>ANÁLISE DETALHADA</h4>
                            {currentReview.categories?.map((cat, idx) => (
                                <div key={idx} className={styles.categoryBlock}>
                                    <div className={styles.catRow}>
                                        <span className={styles.catName}>{cat.name}</span>
                                        <StarRating score={cat.averageScore} />
                                    </div>
                                    {/* Lista de Critérios com Justificativa */}
                                    {cat.criteria && cat.criteria.map((crit, cIdx) => (
                                        <div key={cIdx} className={styles.criteriaItem}>
                                            <div className={styles.criteriaHeader}>
                                                <span className={styles.criteriaName}>{crit.name}</span>
                                                {/* Se tiver nota do criterio individual */}
                                                {crit.score && <span className={styles.criteriaScore}>{crit.score}/100</span>}
                                            </div>
                                            <p className={styles.criteriaJustification}>
                                                {crit.justification || "Sem justificativa."}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ))}
                            {(!currentReview.categories || currentReview.categories.length === 0) && (
                                <p className={styles.noCriteria}>Nenhum critério avaliado</p>
                            )}
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
                                disabled={processedCount === 0}
                                className={styles.navButton}
                            >
                                ← Anterior
                            </button>
                            {/* Mostramos o contador real de revisados */}
                            <span className={styles.navCounter}>{processedCount + 1}/{validResults.length}</span>

                            <button
                                disabled={true}
                                className={styles.navButton}
                                style={{ opacity: 0.3 }}
                            >
                                Próximo →
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className={styles.skippedCard}>
                        {/* Fallback apenas se algo der errado */}
                        <p>Carregando ou finalizado...</p>
                        <button onClick={onGoBack} className={styles.backButton}>
                            Voltar ao Menu
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default BatchQueueView;
