
import React, { useState, useEffect } from 'react';
import styles from './CandidateListView.module.css';
import * as api from '../../services/api.service';
import Header from '../../components/Header/Header';

const CandidateListView = ({ onSelectCandidate, onBack }) => {
    const [talents, setTalents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('ALL');

    useEffect(() => {
        loadTalents();
    }, []);

    const loadTalents = async () => {
        setLoading(true);
        try {
            // Fetch directly from local DB route
            const result = await api.fetchAllTalents(1, 100);
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
        if (!score) return '#cbd5e1'; // Gray
        if (score >= 4) return '#22c55e'; // Green
        if (score >= 3) return '#eab308'; // Yellow
        return '#ef4444'; // Red
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
        if (filterStatus === 'ALL') return t.status !== 'REJECTED'; // Default hides rejected
        if (filterStatus === 'REJECTED') return t.status === 'REJECTED';
        return true;
    });

    const handleRowClick = (talent) => {
        // Trigger Split-Screen Logic
        if (chrome && chrome.tabs && talent.linkedinUsername) {
            const url = `https://www.linkedin.com/in/${talent.linkedinUsername}`;

            // 1. Create or Focus Tab
            chrome.tabs.create({ url, active: false }); // Open in background to keep extension open? 
            // Actually, if we use SidePanel, the extension stays open.

            // 2. Open Detail View locally
            onSelectCandidate(talent);
        } else {
            onSelectCandidate(talent);
        }
    };

    return (
        <div className={styles.container}>
            <Header title="Banco de Talentos" onBack={onBack} />

            <div style={{ marginBottom: '15px' }}>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                    <option value="ALL">Ativos (Ocultar Rejeitados)</option>
                    <option value="REJECTED">Rejeitados</option>
                </select>
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
        </div>
    );
};

export default CandidateListView;
