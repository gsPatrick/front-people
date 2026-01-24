// ATUALIZADO: CandidateListView com Busca e UI Premium
import React, { useState, useEffect, useMemo } from 'react';
import styles from './CandidateListView.module.css';
import * as api from '../../services/api.service';
import Header from '../../components/Header/Header';

const CandidateListView = ({ onSelectCandidate, onBack, onAddFromBank, onAddFromMatch, jobId }) => {
    const [talents, setTalents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
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
        if (!score) return 'var(--text-tertiary)';
        if (score >= 4) return '#10b981';
        if (score >= 3) return '#f59e0b';
        return '#ef4444';
    };

    const renderSyncBadge = (status) => {
        switch (status) {
            case 'SYNCED': return <span className={`${styles.syncBadge} ${styles.syncSynced}`} title="Sincronizado na Nuvem">✅ Cloud</span>;
            case 'PENDING': return <span className={`${styles.syncBadge} ${styles.syncPending}`} title="Aguardando Sincronização">⏳ Sync</span>;
            case 'ERROR': return <span className={`${styles.syncBadge} ${styles.syncError}`} title="Erro no Sync">❌ Erro</span>;
            default: return null;
        }
    };

    const filteredTalents = useMemo(() => {
        return talents.filter(t => {
            // Filtro de Status
            let matchStatus = true;
            if (filterStatus === 'REJECTED') matchStatus = t.status === 'REJECTED';
            else if (filterStatus === 'ACTIVE') matchStatus = (t.status === 'ACTIVE' || t.status === 'NEW' || !t.status);

            if (!matchStatus) return false;

            // Filtro de Busca
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return (
                t.name?.toLowerCase().includes(term) ||
                t.headline?.toLowerCase().includes(term) ||
                t.linkedinUsername?.toLowerCase().includes(term)
            );
        });
    }, [talents, filterStatus, searchTerm]);

    const handleRowClick = (talent) => {
        if (chrome && chrome.tabs && talent.linkedinUsername) {
            const url = `https://www.linkedin.com/in/${talent.linkedinUsername}`;
            chrome.tabs.create({ url, active: false });
        }
        onSelectCandidate(talent);
    };

    return (
        <div className={styles.container}>
            <Header title="Banco de Talentos" onBack={onBack} />

            <div className={styles.controlsBar}>
                <div className={styles.searchWrapper}>
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Buscar por nome, cargo ou LinkedIn..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <select
                    className={styles.filterSelect}
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                >
                    <option value="ALL">Todos os Perfis</option>
                    <option value="ACTIVE">Apenas Ativos</option>
                    <option value="REJECTED">Rejeitados</option>
                </select>

                <button
                    className={styles.addButton}
                    onClick={() => setShowAddModal(true)}
                >
                    <span>+</span> Adicionar Candidato
                </button>
            </div>

            <div className={styles.tableContainer}>
                <div className={styles.tableHeader}>
                    <div>Nome / Headline</div>
                    <div>Local</div>
                    <div>Match AI</div>
                    <div>Status</div>
                    <div>Sincronia</div>
                </div>

                <div className={styles.tableBody}>
                    {loading ? (
                        <div className={styles.emptyState}>Carregando talentos...</div>
                    ) : filteredTalents.length === 0 ? (
                        <div className={styles.emptyState}>
                            {searchTerm ? `Nenhum talento encontrado para "${searchTerm}"` : "Nenhum talento cadastrado ainda."}
                        </div>
                    ) : (
                        filteredTalents.map(talent => (
                            <div
                                key={talent.id}
                                className={`${styles.tableRow} ${talent.status === 'REJECTED' ? styles.rejected : ''}`}
                                onClick={() => handleRowClick(talent)}
                            >
                                <div className={styles.nameInfo}>
                                    <div className={styles.nameCell}>{talent.name}</div>
                                    <div className={styles.headlineCell}>{talent.headline || '-'}</div>
                                </div>
                                <div className={styles.cell}>{talent.location || '-'}</div>
                                <div className={styles.cell}>
                                    <div className={styles.scoreWrapper}>
                                        <span
                                            className={styles.scoreBadge}
                                            style={{ color: getScoreColor(talent.matchScore) }}
                                        >
                                            {talent.matchScore ? talent.matchScore.toFixed(1) : '-'}
                                        </span>
                                    </div>
                                </div>
                                <div className={styles.cell}>
                                    <span className={`${styles.statusBadge} ${styles['status' + (talent.status?.charAt(0).toUpperCase() + talent.status?.slice(1).toLowerCase())]}`}>
                                        {talent.status === 'NEW' ? 'Novo' :
                                            talent.status === 'ACTIVE' ? 'Ativo' :
                                                talent.status === 'REJECTED' ? 'Rejeitado' : (talent.status || 'Ativo')}
                                    </span>
                                </div>
                                <div className={styles.cell}>
                                    {renderSyncBadge(talent.syncStatus)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {showAddModal && (
                <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>Adicionar à Vaga</h3>
                        <p className={styles.modalSub}>Selecione como deseja prosseguir com a adição deste candidato:</p>

                        <div className={styles.modalActions}>
                            <button
                                className={styles.modalBtnSecondary}
                                onClick={() => { setShowAddModal(false); if (onAddFromBank) onAddFromBank(); }}
                            >
                                📂 Buscar no Banco de Talentos
                            </button>

                            <button
                                className={styles.modalBtnPrimary}
                                onClick={() => { setShowAddModal(false); if (onAddFromMatch) onAddFromMatch(); }}
                            >
                                🚀 Novo via Match / LinkedIn
                            </button>

                            <button
                                className={styles.modalBtnCancel}
                                onClick={() => setShowAddModal(false)}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CandidateListView;

