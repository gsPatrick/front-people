/* global chrome */
// BatchQueueView Refatorado: Sem emojis e com validação profissional
import React, { useState, useEffect, useMemo } from 'react';
import styles from './BatchQueue.module.css';
import Header from '../../components/Header/Header';
import {
    BsPlayFill,
    BsStopFill,
    BsCheckCircleFill,
    BsXCircleFill,
    BsArrowRepeat,
    BsStarFill,
    BsStar,
    BsChevronLeft,
    BsSearch,
    BsExclamationTriangleFill,
    BsInfoCircleFill,
    BsTrashFill
} from 'react-icons/bs';

// Componente Interno de Estrelas (Profissional)
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

// Modal de Validação Profissional
const ValidationModal = ({ isOpen, title, message, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalIcon}><BsExclamationTriangleFill size={24} /></div>
                <h3 className={styles.modalTitle}>{title}</h3>
                <p className={styles.modalMessage}>{message}</p>
                <button className={styles.modalButton} onClick={onClose}>Entendido</button>
            </div>
        </div>
    );
};

const BatchQueueView = ({
    scorecard,
    queueState,
    // eslint-disable-next-line no-unused-vars
    onStartQueue,
    onStopQueue,
    onAcceptProfile,
    onRejectProfile,
    onGoBack,
    onAutoSource,
    onResetQueue,
    navigationState,
    onStartDirect
}) => {
    const { isRunning, tabs, currentIndex, results } = queueState;
    const totalTabs = tabs.length;
    const processed = results.length;
    const progress = totalTabs > 0 ? (processed / totalTabs) * 100 : 0;

    const sortedResults = useMemo(() => {
        const successes = results.filter(r => !r.error);
        const failures = results.filter(r => r.error);
        successes.sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0));
        return [...successes, ...failures];
    }, [results]);

    const [currentTabUrl, setCurrentTabUrl] = useState('');
    const [processedIds, setProcessedIds] = useState(new Set());
    const [selectedProfile, setSelectedProfile] = useState(null);

    const [sourceTargetCount, setSourceTargetCount] = useState('50'); // String para permitir apagar

    // Modal de Erro
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '' });

    // Perfis Analisados (para exibição na fila)
    const statusItems = useMemo(() => {
        const items = [];
        // Perfis já finalizados
        sortedResults.forEach((res, idx) => {
            items.push({
                id: res.username || `done-${idx}`,
                name: res.name || 'Perfil Analisado',
                status: 'completed',
                score: res.averageScore
            });
        });

        // Perfil sendo processado agora (se houver)
        if (isRunning && currentIndex < totalTabs && currentIndex >= 0) {
            items.push({
                id: 'current',
                name: `Perfil ${currentIndex + 1}`,
                status: 'processing'
            });
        }

        // Próximos na fila (limitado para não poluir o layout)
        const remaining = isRunning ? (totalTabs - (currentIndex + 1)) : 0;
        if (remaining > 0) {
            const showNext = Math.min(remaining, 3);
            for (let i = 1; i <= showNext; i++) {
                items.push({
                    id: `next-${i}`,
                    name: `Perfil ${currentIndex + 1 + i}`,
                    status: 'pending'
                });
            }
            if (remaining > showNext) {
                items.push({
                    id: 'more',
                    name: `+ ${remaining - showNext} perfis na fila`,
                    status: 'more'
                });
            }
        }

        return items;
    }, [sortedResults, currentIndex, totalTabs, isRunning]);

    // O estado de configuração agora é controlado primariamente pelo que o sistema está fazendo
    // Se não está rodando, não está buscando e não tem resultados, mostra config.
    const isSourcing = queueState.isSourcing;
    const showConfig = !isRunning && !isSourcing && results.length === 0;

    // NOVO: Disparo automático se vier via "Analisar com IA" ou "Captura Individual"
    useEffect(() => {
        if (navigationState?.autoStartUrl && results.length === 0 && !isSourcing && !isRunning) {
            console.log("[BatchQueueView] Auto-start detectado para:", navigationState.autoStartUrl);
            onAutoSource(navigationState.autoStartUrl, scorecard?.id, 1);
        }

        if (navigationState?.autoStartDirectUrl && results.length === 0 && !isSourcing && !isRunning && onStartDirect) {
            console.log("[BatchQueueView] Auto-start DIRETO detectado para:", navigationState.autoStartDirectUrl);
            onStartDirect(navigationState.autoStartDirectUrl, scorecard?.id);
        }
    }, [navigationState?.autoStartUrl, navigationState?.autoStartDirectUrl, scorecard?.id, results.length, isSourcing, isRunning, onAutoSource, onStartDirect]);

    // Sincroniza abertura do LinkedIn Search
    // Sincroniza detecção da URL atual (apenas para exibição/config)
    useEffect(() => {
        const checkCurrentTab = () => {
            if (chrome?.tabs) {
                chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
                    const url = tabs[0]?.url || '';
                    if (url) setCurrentTabUrl(url);
                });
            }
        };

        if (showConfig) {
            checkCurrentTab();
        }

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
    }, [showConfig]);

    const handleDecision = (profile, decision) => {
        setProcessedIds(prev => new Set([...prev, profile.username]));
        if (decision === 'accept') {
            onAcceptProfile(profile);
        } else {
            onRejectProfile(profile);
        }
        if (profile.tabId && chrome?.tabs) {
            chrome.tabs.remove(profile.tabId).catch(() => { });
        }
        if (selectedProfile && selectedProfile.username === profile.username) {
            setSelectedProfile(null);
        }
    };

    const _GetScoreColor = (score) => {
        if (!score) return '#cbd5e1';
        if (score >= 4) return '#22c55e';
        if (score >= 3) return '#eab308';
        return '#ef4444';
    };

    const handleStartSource = async () => {
        const count = parseInt(sourceTargetCount);

        if (!sourceTargetCount || count <= 0 || isNaN(count)) {
            setModalConfig({
                isOpen: true,
                title: 'Valor Inválido',
                message: 'É necessário buscar pelo menos 1 perfil para iniciar a análise.'
            });
            return;
        }

        if (count > 150) {
            setModalConfig({
                isOpen: true,
                title: 'Limite Excedido',
                message: 'O limite total do sistema é de 150 perfis por busca.'
            });
            return;
        }

        // Determina a URL de busca
        const finalSearchUrl = (currentTabUrl && currentTabUrl.includes('linkedin.com/search/results/people'))
            ? currentTabUrl
            : 'https://www.linkedin.com/search/results/people/';

        try {
            await onAutoSource(finalSearchUrl, scorecard?.id, count);
        } catch (error) {
            setModalConfig({
                isOpen: true,
                title: 'Erro na Busca',
                message: error.message
            });
        }
    };

    // --- RENDERERS ---

    if (isSourcing) {
        return (
            <div className={styles.container}>
                <Header title="Buscando Perfis" subtitle="O sistema está processando a automação" />
                <main className={styles.contentCentered}>
                    <div className={styles.loadingSpinner}></div>
                    <div style={{ textAlign: 'center', color: '#64748b', maxWidth: '320px' }}>
                        <p style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '12px' }}>
                            Navegando e coletando perfis...
                        </p>
                        <p style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '8px' }}>
                            O processamento ocorre em segundo plano. Você pode navegar em outras abas enquanto aguarda.
                        </p>
                        <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                            Os resultados aparecerão automaticamente nesta tela ao finalizar.
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    if (showConfig) {
        const isOnSearchPage = currentTabUrl && currentTabUrl.includes('linkedin.com/search/results/people');

        return (
            <div className={styles.container}>
                <Header
                    title="Configurar Busca"
                    subtitle={isOnSearchPage ? "Importar da busca ativa" : "Iniciar nova busca"}
                    onBack={onGoBack}
                />
                <main className={styles.paddingContent}>
                    <div className={styles.infoBox}>
                        <BsInfoCircleFill style={{ marginRight: '8px' }} />
                        <span>
                            {isOnSearchPage
                                ? "O sistema utilizará os filtros ativos na sua busca atual."
                                : "A busca será aberta automaticamente no LinkedIn."}
                        </span>
                    </div>

                    <label className={styles.label}>Quantidade de perfis</label>
                    <input
                        type="number"
                        className={styles.inputNumber}
                        value={sourceTargetCount}
                        placeholder="Ex: 50"
                        onChange={(e) => setSourceTargetCount(e.target.value)}
                    />
                    <p className={styles.inputHelp}>Valor recomendado: até 50 perfis por vez.</p>

                    <button className={styles.primaryButton} onClick={handleStartSource}>
                        {isOnSearchPage ? "Capturar Resultados" : "Abrir LinkedIn e Buscar"}
                    </button>

                    <ValidationModal
                        isOpen={modalConfig.isOpen}
                        title={modalConfig.title}
                        message={modalConfig.message}
                        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                    />
                </main>
            </div>
        );
    }

    if (isRunning) {
        return (
            <div className={styles.container}>
                <Header title="Processando Fila" subtitle={`${processed}/${totalTabs} perfis finalizados`} />
                <main className={styles.contentCentered}>
                    <div className={styles.progressSection}>
                        <div className={styles.progressText}>{Math.round(progress)}%</div>
                        <div className={styles.progressBar}>
                            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                        </div>

                        <div className={styles.queueList}>
                            {statusItems.map((item) => (
                                <div
                                    key={item.id}
                                    className={`${styles.queueItem} ${item.status === 'processing' ? styles.queueItemActive : ''}`}
                                >
                                    <div className={styles.queueItemInfo}>
                                        {item.status === 'completed' && <BsCheckCircleFill className={styles.successIcon} />}
                                        {item.status === 'processing' && <div className={styles.modernSpinner} />}
                                        {item.status === 'pending' && <BsPlayFill style={{ color: '#64748b' }} />}
                                        {item.status === 'more' && <BsInfoCircleFill style={{ color: '#64748b' }} />}

                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span className={styles.queueItemName}>{item.name}</span>
                                            <span className={styles.queueItemStatus}>
                                                {item.status === 'completed' ? `Score: ${item.score?.toFixed(1) || '-'}` : ''}
                                                {item.status === 'processing' ? 'Analisando...' : ''}
                                                {item.status === 'pending' ? 'Aguardando...' : ''}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button onClick={onStopQueue} className={styles.stopButton}>
                            <BsStopFill /> Parar Processamento
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    // A tela de "Vazia/Detecção" foi removida para ir direto para a config via logic acima.

    if (selectedProfile) {
        const isProcessed = processedIds.has(selectedProfile.username);
        return (
            <div className={styles.container}>
                <div className={styles.detailHeader}>
                    <button onClick={() => setSelectedProfile(null)} className={styles.iconButton}>
                        <BsChevronLeft /> Voltar para Lista
                    </button>
                    <span className={styles.detailTitle}>Análise Detalhada</span>
                </div>
                <main className={styles.content}>
                    <div className={styles.reviewCard}>
                        <div className={styles.cardHeader}>
                            <div className={styles.info}>
                                <h3 style={{ fontSize: '18px', fontWeight: '700' }}>{selectedProfile.name}</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{selectedProfile.headline}</p>
                            </div>
                            <div className={styles.scoreBadge}>
                                {selectedProfile.averageScore?.toFixed(1) || '-'}
                            </div>
                        </div>

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
                            <div className={styles.sectionCard}>
                                <div className={styles.detailItem}>
                                    <div className={styles.icon} style={{ color: 'var(--accent-primary)', marginTop: '4px' }}><BsPlayFill /></div>
                                    <div style={{ width: '100%' }}>
                                        <strong style={{ fontSize: '18px', color: 'var(--text-primary)', display: 'block', marginBottom: '16px' }}>Resumo Geral</strong>
                                        <ul className={styles.summaryList}>
                                            {(selectedProfile.strengths || []).map((s, i) => (
                                                <li key={`s-${i}`} className={styles.summaryItem}>{s}</li>
                                            ))}
                                            {(selectedProfile.weaknesses || []).map((w, i) => (
                                                <li key={`w-${i}`} className={styles.summaryItem}>{w}</li>
                                            ))}
                                            {(!selectedProfile.strengths?.length && !selectedProfile.weaknesses?.length) && (
                                                <li className={styles.summaryItem}>Nenhuma informação de resumo identificada.</li>
                                            )}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={styles.categoriesReview}>
                            {selectedProfile.categories?.map((cat, idx) => (
                                <div key={idx} className={styles.sectionCard}>
                                    <div className={styles.catRow} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                                        <span className={styles.catName} style={{ fontWeight: '700', fontSize: '18px', color: 'var(--text-primary)' }}>{cat.name}</span>
                                        <StarRating score={cat.averageScore} />
                                    </div>
                                    <div style={{ marginBottom: '24px' }}>
                                        <span className={styles.qLabel}>Análise da Categoria</span>
                                        <p className={styles.detailItem} style={{ fontStyle: 'italic', fontSize: '15px' }}>{cat.justification}</p>
                                    </div>

                                    <div className={styles.catCriteriaList} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {(cat.criteria || []).map((crit, cidx) => (
                                            <div key={cidx} className={styles.miniCrit} style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px', color: '#cbd5e1', border: '1px solid var(--border-color)' }}>
                                                <span className={styles.qLabel}>Pergunta / Critério</span>
                                                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '12px', fontSize: '15px', lineHeight: '1.4' }}>{crit.name}</strong>

                                                <span className={styles.qLabel}>Resposta / Análise</span>
                                                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6' }}>{crit.justification}</p>
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
                                    if (profile.url) {
                                        window.open(profile.url, '_blank');
                                    } else if (profile.username) {
                                        window.open(`https://www.linkedin.com/in/${profile.username}`, '_blank');
                                    }
                                }
                            }}
                            style={profile.error ? { borderLeft: '4px solid #ef4444', opacity: 0.8 } : {}}
                        >
                            {profile.error ? (
                                <div className={styles.errorContent} style={{ padding: '12px', color: '#ef4444', width: '100%' }}>
                                    <strong>Falha técnica:</strong> {profile.error}
                                </div>
                            ) : (
                                <>
                                    <div className={styles.scoreColumn}>
                                        <span className={styles.miniScore}>
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
                                                    <BsXCircleFill />
                                                </button>
                                                <button
                                                    className={styles.miniAcceptBtn}
                                                    onClick={(e) => { e.stopPropagation(); handleDecision(profile, 'accept'); }}
                                                    title="Aceitar"
                                                >
                                                    <BsCheckCircleFill />
                                                </button>
                                            </>
                                        ) : (
                                            <span className={styles.processedCheck}><BsCheckCircleFill /></span>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)' }}>
                <button
                    onClick={() => {
                        // Limpa os resultados antes de voltar
                        if (onResetQueue) {
                            onResetQueue();
                        }
                        onGoBack();
                    }}
                    style={{
                        width: '100%',
                        padding: '12px',
                        background: '#fff', // Fundo branco como solicitado para o tema
                        color: '#ef4444', // Texto vermelho para indicar ação de apagar
                        border: '1px solid #ef4444',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                    }}
                >
                    Limpar Fila e Voltar
                </button>
            </div>
        </div>
    );
};

export default BatchQueueView;
