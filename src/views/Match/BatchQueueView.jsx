// NOVO: BatchQueueView Refatorado para Tabela (Lista Ranqueada)
import React, { useState, useEffect, useMemo } from 'react';
import styles from './BatchQueue.module.css';
import Header from '../../components/Header/Header';
import { BsPlayFill, BsStopFill, BsCheckCircleFill, BsXCircleFill, BsArrowRepeat, BsStarFill, BsStar, BsChevronLeft, BsSearch } from 'react-icons/bs';

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
    onAutoSource
}) => {
    const { isRunning, tabs, currentIndex, results } = queueState;
    const totalTabs = tabs.length;
    const processed = results.length;
    const progress = totalTabs > 0 ? (processed / totalTabs) * 100 : 0;

    // MUDANÇA: Não filtrar erros, apenas ordenar para que erros fiquem no final ou inicio
    const sortedResults = useMemo(() => {
        // Separa sucessos de erros
        const successes = results.filter(r => !r.error);
        const failures = results.filter(r => r.error);

        // Ordena sucessos pelo score
        successes.sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0));

        // Retorna tudo (erros primeiro para chamar atenção ou ultimo? Vou por ultimo)
        return [...successes, ...failures];
    }, [results]);

    const [currentTabUrl, setCurrentTabUrl] = useState('');
    const [processedIds, setProcessedIds] = useState(new Set());
    const [selectedProfile, setSelectedProfile] = useState(null); // Para o Detalhe

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
                        setCurrentTabUrl(url);
                        // Auto-open config if on search page AND NOT sourcing/running
                        if (url.includes('linkedin.com/search/results/people') && !isSourcing && !isRunning) {
                            setShowSourceConfig(true);
                        }
                    }
                });
            }
        };
        checkCurrentTab();
        const handleUpdate = (tabId, changeInfo, tab) => { if (changeInfo.status === 'complete' && tab.active) checkCurrentTab(); };
        const handleActivated = () => checkCurrentTab();
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
    }, [isSourcing, isRunning]);

    // Foca na aba do selecionado
    useEffect(() => {
        if (selectedProfile && selectedProfile.tabId && chrome?.tabs) {
            chrome.tabs.update(selectedProfile.tabId, { active: true }).catch(() => { });
        }
    }, [selectedProfile]);

    const handleDecision = (profile, decision) => {
        setProcessedIds(prev => new Set([...prev, profile.username]));
        if (decision === 'accept') {
            onAcceptProfile(profile);
        } else {
            onRejectProfile(profile);
        }
        // Se estiver vendo detalhes, volta para lista? Não, talvez queira continuar no detalhe mas mostrar status.
        // Mas o Requisito diz: "Decisão pode ser feita diretamente na lista"
        // Vamos fechar a aba se for rejeitado/aceito? O usuário pediu persistence.
        if (profile.tabId && chrome?.tabs) {
            chrome.tabs.remove(profile.tabId).catch(() => { });
        }

        // Se estiver no modo detalhe e decidir, volta pra lista
        if (selectedProfile && selectedProfile.username === profile.username) {
            setSelectedProfile(null);
        }
    };

    const getScoreColor = (score) => {
        if (!score) return '#cbd5e1';
        if (score >= 4) return '#22c55e'; // Green
        if (score >= 3) return '#eab308'; // Yellow
        return '#ef4444'; // Red
    };

    // --- RENDERERS ---

    // 1. Loading Sourcing
    if (isSourcing) {
        return (
            <div className={styles.container}>
                <Header title="Buscando Perfis..." subtitle="O robô está trabalhando" />
                <main className={styles.contentCentered}>
                    <div className={styles.loadingSpinner}></div>
                    <div style={{ textAlign: 'center', color: '#64748b', maxWidth: '320px' }}>
                        <p style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '12px' }}>Navegando e coletando perfis... 🤖</p>
                        <p style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '8px' }}>
                            Fique tranquilo! Você pode <strong>minimizar esta aba</strong> ou <strong>abrir uma nova aba</strong> para continuar trabalhando.
                        </p>
                        <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                            Quando voltar, tudo estará prontinho! ✨
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    // 2. Config Sourcing
    if (showSourceConfig && !isSourcing && !isRunning) {
        return (
            <div className={styles.container}>
                <Header title="Configurar Busca" subtitle="Defina os parâmetros" onBack={() => setShowSourceConfig(false)} />
                <main className={styles.paddingContent}>
                    {/* ... (mantido igual, apenas resumindo para caber no replace) ... */}
                    <div className={styles.infoBox}>
                        <p>O sistema usará a busca aberta no LinkedIn.</p>
                    </div>
                    <label className={styles.label}>Quantos perfis?</label>
                    <select
                        className={styles.select}
                        value={sourceTargetCount}
                        onChange={(e) => setSourceTargetCount(Number(e.target.value))}
                    >
                        <option value={10}>10 perfis</option>
                        <option value={50}>50 perfis</option>
                        <option value={100}>100 perfis</option>
                    </select>
                    <button
                        className={styles.primaryButton}
                        onClick={async () => {
                            setShowSourceConfig(false);
                            setIsSourcing(true);
                            try {
                                await onAutoSource(currentTabUrl, scorecard?.id, sourceTargetCount);
                                setIsSourcing(false);
                            } catch (error) {
                                alert("Erro: " + error.message);
                                setIsSourcing(false);
                                setShowSourceConfig(true);
                            }
                        }}
                    >
                        🚀 Iniciar Busca
                    </button>
                </main>
            </div>
        );
    }

    // 3. Queue Running Progress
    if (isRunning) {
        return (
            <div className={styles.container}>
                <Header title="Processando Fila" subtitle={`${processed}/${totalTabs} processados`} />
                <main className={styles.content}>
                    <div className={styles.progressSection}>
                        <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${progress}%` }} /></div>
                        <p className={styles.progressText}>{Math.round(progress)}%</p>
                        <div className={styles.currentProcessing}>
                            <BsArrowRepeat className={styles.spinIcon} /> <span>Analisando Perfil...</span>
                        </div>
                        <button onClick={onStopQueue} className={styles.stopButton}><BsStopFill /> Parar</button>
                    </div>
                </main>
            </div>
        );
    }

    // 4. Empty State (Detection)
    if (results.length === 0) {
        return (
            <div className={styles.container}>
                <Header title="Fila em Lote" subtitle={`Scorecard: ${scorecard?.name || '-'}`} onBack={onGoBack} />
                <main className={styles.content}>
                    <div className={styles.detectionSection}>
                        <h2>{totalTabs} perfis encontrados</h2>

                        <button
                            className={styles.sourceButton}
                            style={{
                                background: 'linear-gradient(135deg, var(--accent-secondary), var(--accent-primary))',
                                width: '100%',
                                padding: '14px',
                                fontSize: '15px',
                                fontWeight: '600',
                                color: 'var(--bg-primary)',
                                border: 'none',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px var(--glow-color)'
                            }}
                            onClick={() => {
                                if (currentTabUrl && currentTabUrl.includes('linkedin.com/search/results/people')) setShowSourceConfig(true);
                                else window.open('https://www.linkedin.com/search/results/people/', '_blank');
                            }}>
                            {(currentTabUrl && currentTabUrl.includes('linkedin.com/search/results/people')) ? <><BsSearch /> Importar Busca</> : <><BsSearch /> Ir para Busca</>}
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    // 5. DETAIL VIEW (Drill Down)
    if (selectedProfile) {
        const isProcessed = processedIds.has(selectedProfile.username);
        return (
            <div className={styles.container}>
                <div className={styles.detailHeader}>
                    <button onClick={() => setSelectedProfile(null)} className={styles.iconButton}>
                        <BsChevronLeft /> Voltar
                    </button>
                    <span className={styles.detailTitle}>Detalhes do Match</span>
                </div>
                <main className={styles.content}>
                    <div className={styles.reviewCard}>
                        <div className={styles.cardHeader}>
                            <div className={styles.info}>
                                <h3>{selectedProfile.name}</h3>
                                <p>{selectedProfile.headline}</p>
                            </div>
                            <div className={styles.scoreBadge} style={{ backgroundColor: getScoreColor(selectedProfile.averageScore) }}>
                                {selectedProfile.averageScore?.toFixed(1) || '-'}
                            </div>
                        </div>

                        {/* Ações no Detalhe */}
                        {!isProcessed && (
                            <div className={styles.reviewActions}>
                                <button onClick={() => handleDecision(selectedProfile, 'reject')} className={styles.rejectButton}>
                                    <BsXCircleFill /> Rejeitar
                                </button>
                                <button onClick={() => handleDecision(selectedProfile, 'accept')} className={styles.acceptButton}>
                                    <BsCheckCircleFill /> Aceitar
                                </button>
                            </div>
                        )}
                        {isProcessed && (
                            <div className={styles.processedBadge}>Decisão Registrada</div>
                        )}

                        <div className={styles.matchDetails}>
                            <div className={styles.detailItem}>
                                <span className={styles.icon}>🎯</span>
                                <div><strong>Pontos Fortes</strong><p>{selectedProfile.strengths?.join(', ') || '-'}</p></div>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.icon}>⚠️</span>
                                <div><strong>Pontos de Atenção</strong><p>{selectedProfile.weaknesses?.join(', ') || '-'}</p></div>
                            </div>
                        </div>

                        <div className={styles.categoriesReview}>
                            {selectedProfile.categories?.map((cat, idx) => (
                                <div key={idx} className={styles.categoryBlock}>
                                    <div className={styles.catRow}>
                                        <span className={styles.catName}>{cat.name}</span>
                                        <StarRating score={cat.averageScore} />
                                    </div>
                                    <p className={styles.catJustification}>{cat.justification}</p>
                                    {/* Exibir itens individuais se existirem */}
                                    <div className={styles.catCriteriaList}>
                                        {(cat.criteria || []).map((crit, cidx) => (
                                            <div key={cidx} className={styles.miniCrit}>
                                                <strong>{crit.name}:</strong> {crit.justification}
                                            </div>
                                        ))}
                                    </div>

                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // 6. TABLE LIST (Main View)
    return (
        <div className={styles.container}>
            <Header title="Resultados do Match" subtitle={`${sortedResults.length} perfis analisados`} onBack={onGoBack} />
            <div className={styles.tableContainer}>
                {sortedResults.map((profile, idx) => {
                    const isProcessed = processedIds.has(profile.username);
                    return (
                        <div
                            key={idx}
                            className={`${styles.tableRow} ${isProcessed ? styles.dimmed : ''} ${profile.error ? styles.errorRow : ''}`}
                            onClick={() => {
                                if (!profile.error) {
                                    setSelectedProfile(profile);
                                    // Abre o perfil no LinkedIn em nova aba se houver URL
                                    if (profile.url) {
                                        window.open(profile.url, '_blank');
                                    } else if (profile.username) {
                                        // Fallback se tiver apenas username
                                        window.open(`https://www.linkedin.com/in/${profile.username}`, '_blank');
                                    }
                                }
                            }}
                            style={profile.error ? { borderLeft: '4px solid #ef4444', opacity: 0.8 } : {}}
                        >
                            {profile.error ? (
                                <div className={styles.errorContent} style={{ padding: '12px', color: '#ef4444', width: '100%' }}>
                                    <strong>Falha:</strong> {profile.error}
                                </div>
                            ) : (
                                <>
                                    <div className={styles.scoreColumn}>
                                        <span className={styles.miniScore} style={{ backgroundColor: getScoreColor(profile.averageScore) }}>
                                            {profile.averageScore?.toFixed(1) || '-'}
                                        </span>
                                    </div>
                                    <div className={styles.infoColumn}>
                                        <span className={styles.rowName}>{profile.name}</span>
                                        <span className={styles.rowHeadline}>{profile.headline}</span>
                                    </div>
                                    <div className={styles.actionsColumn}>
                                        {!isProcessed ? (
                                            <>
                                                <button
                                                    className={styles.miniRejectBtn}
                                                    onClick={(e) => { e.stopPropagation(); handleDecision(profile, 'reject'); }}
                                                    title="Rejeitar"
                                                >
                                                    ✕
                                                </button>
                                                <button
                                                    className={styles.miniAcceptBtn}
                                                    onClick={(e) => { e.stopPropagation(); handleDecision(profile, 'accept'); }}
                                                    title="Aceitar"
                                                >
                                                    ✓
                                                </button>
                                            </>
                                        ) : (
                                            <span className={styles.processedCheck}>✓</span>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Botão Limpar Lista */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0' }}>
                <button
                    onClick={onGoBack}
                    style={{
                        width: '100%',
                        padding: '12px',
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
                    }}
                    onMouseEnter={(e) => { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)'; }}
                    onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.3)'; }}
                >
                    🗑️ Limpar Lista e Voltar
                </button>
            </div>
        </div>
    );
};

export default BatchQueueView;
