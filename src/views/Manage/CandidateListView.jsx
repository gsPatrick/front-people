// ATUALIZADO: CandidateListView com Botão de Adicionar e Modal
import React, { useState, useEffect } from 'react';
import styles from './CandidateListView.module.css';
import * as api from '../../services/api.service';
import Header from '../../components/Header/Header';

const CandidateListView = ({ onSelectCandidate, onBack, onAddFromBank, onAddFromMatch, jobId }) => {
    const [talents, setTalents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [showAddModal, setShowAddModal] = useState(false);

    useEffect(() => {
        loadTalents();
    }, [jobId]);

    const loadTalents = async () => {
        setLoading(true);
        try {
            const result = await api.fetchAllTalents(1, 100, { jobId });
            if (result.success && result.data) {
                setTalents(result.data.talents);
            }
        } catch (error) {
            console.error("Erro ao carregar talentos:", error);
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score) => {
        if (!score) return 'rgba(203, 213, 225, 0.2)'; // Fundo suave para lista
        if (score >= 4) return '#22c55e';
        if (score >= 3) return '#eab308';
        return '#ef4444';
    };

    const renderSyncBadge = (status) => {
        switch (status) {
            case 'SYNCED': return <span className={`${styles.syncBadge} ${styles.syncSynced}`} title="Sincronizado">✅ Cloud</span>;
            case 'PENDING': return <span className={`${styles.syncBadge} ${styles.syncPending}`} title="Aguardando Sync">⏳ Sync</span>;
            case 'ERROR': return <span className={`${styles.syncBadge} ${styles.syncError}`} title="Erro no Sync">❌ Erro</span>;
            default: return null;
        }
    };

    const filteredTalents = talents.filter(t => {
        if (filterStatus === 'ALL') return true; // Mostrar todos (incluindo rej)
        if (filterStatus === 'REJECTED') return t.status === 'REJECTED';
        if (filterStatus === 'NEW') return t.status === 'NEW';
        return true;
    });

    const handleRowClick = (talent) => {
        // Trigger Split-Screen Logic
        if (chrome && chrome.tabs && talent.linkedinUsername) {
            const url = `https://www.linkedin.com/in/${talent.linkedinUsername}`;
            // 1. Create or Focus Tab
            chrome.tabs.create({ url, active: false }); // Open in background
            // 2. Open Detail View locally
            onSelectCandidate(talent);
        } else {
            onSelectCandidate(talent);
        }
    };

    return (
        <div className={styles.container}>
            <Header title="Banco de Talentos" onBack={onBack} />

            <div className={styles.controlsBar} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                    <option value="ALL">Ativos (Ocultar Rejeitados)</option>
                    <option value="REJECTED">Rejeitados</option>
                </select>

                <button
                    className={styles.addButton}
                    onClick={() => setShowAddModal(true)}
                    style={{
                        backgroundColor: '#2563eb', color: 'white', border: 'none',
                        padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer'
                    }}
                >
                    + Adicionar Candidato
                </button>
            </div>

            {loading ? <p>Carregando...</p> : (
                <div className={styles.tableContainer}>
                    <div className={styles.tableHeader}>
                        <div>Nome / Headline</div>
                        <div>Local</div>
                        <div>Match AI</div>
                        <div>Status</div>
                        <div>Nuvem</div>
                    </div>
                    {filteredTalents.map(talent => (
                        <div
                            key={talent.id}
                            className={`${styles.tableRow} ${talent.status === 'REJECTED' ? styles.rejected : ''}`}
                            onClick={() => handleRowClick(talent)}
                        >
                            <div className={styles.cell}>
                                <div className={styles.nameCell}>{talent.name}</div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>{talent.headline}</div>
                            </div>
                            <div className={styles.cell}>{talent.location || '-'}</div>
                            <div className={styles.cell}>
                                <span
                                    className={styles.scoreBadge}
                                    style={{ backgroundColor: getScoreColor(talent.matchScore) }}
                                >
                                    {talent.matchScore ? talent.matchScore.toFixed(1) : '-'}
                                </span>
                            </div>
                            <div className={styles.cell}>
                                <span className={`${styles.statusBadge} ${styles['status' + (talent.status?.charAt(0).toUpperCase() + talent.status?.slice(1).toLowerCase())]}`}>
                                    {talent.status === 'NEW' ? 'Novo' :
                                        talent.status === 'ACTIVE' ? 'Ativo' :
                                            talent.status === 'REJECTED' ? 'Rejeitado' : talent.status}
                                </span>
                            </div>
                            <div className={styles.cell}>
                                {renderSyncBadge(talent.syncStatus)}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL DE ADIÇÃO */}
            {showAddModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '320px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)', textAlign: 'center'
                    }}>
                        <h3 style={{ marginTop: 0, color: '#1e293b' }}>Adicionar à Vaga</h3>
                        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>Você quer buscar alguém que já existe ou encontrar alguém novo?</p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button
                                onClick={() => { setShowAddModal(false); if (onAddFromBank) onAddFromBank(); }}
                                style={{
                                    padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                                    backgroundColor: 'white', color: '#334155', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                }}
                            >
                                📂 Buscar no Banco de Talentos
                            </button>

                            <button
                                onClick={() => { setShowAddModal(false); if (onAddFromMatch) onAddFromMatch(); }}
                                style={{
                                    padding: '12px', borderRadius: '8px', border: 'none',
                                    backgroundColor: '#7e22ce', color: 'white', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                }}
                            >
                                🚀 Novo via Match / LinkedIn
                            </button>
                        </div>

                        <button
                            onClick={() => setShowAddModal(false)}
                            style={{
                                marginTop: '20px', backgroundColor: 'transparent', border: 'none',
                                color: '#94a3b8', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline'
                            }}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CandidateListView;
