// CandidateListView.jsx - Layout Moderno e Minimalista
import React, { useState, useEffect, useMemo } from 'react';
import styles from './CandidateListView.module.css';
import * as api from '../../services/api.service';
import Header from '../../components/Header/Header';

const CandidateListView = ({ onSelectCandidate, onBack, onAddFromBank, onAddFromMatch, onReconsider, jobId }) => {
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

    const getStatusStyle = (status) => {
        switch (status) {
            case 'REJECTED':
                return { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', text: 'Rejeitado' };
            case 'ACTIVE':
                return { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', text: 'Ativo' };
            case 'NEW':
                return { bg: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', text: 'Novo' };
            default:
                return { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', text: 'Ativo' };
        }
    };

    const filteredTalents = useMemo(() => {
        return talents.filter(t => {
            let matchStatus = true;
            if (filterStatus === 'REJECTED') matchStatus = t.status === 'REJECTED';
            else if (filterStatus === 'ACTIVE') matchStatus = (t.status === 'ACTIVE' || t.status === 'NEW' || !t.status);

            if (!matchStatus) return false;

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
        onSelectCandidate(talent);
    };

    const handleReconsiderClick = (e, talent) => {
        e.stopPropagation();
        if (onReconsider) onReconsider(talent);
    };

    return (
        <div className={styles.container}>
            <Header title="Banco de Talentos" onBack={onBack} />

            <div className={styles.controlsBar}>
                <div className={styles.searchWrapper}>
                    <svg className={styles.searchIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
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
                    + Adicionar Candidato
                </button>
            </div>

            <div className={styles.talentList}>
                {loading ? (
                    <div className={styles.emptyState}>
                        <div className={styles.loader}></div>
                        <p>Carregando talentos...</p>
                    </div>
                ) : filteredTalents.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p>{searchTerm ? `Nenhum talento encontrado para "${searchTerm}"` : "Nenhum talento cadastrado ainda."}</p>
                    </div>
                ) : (
                    filteredTalents.map(talent => {
                        const statusInfo = getStatusStyle(talent.status);
                        return (
                            <div
                                key={talent.id}
                                className={styles.talentCard}
                                onClick={() => handleRowClick(talent)}
                            >
                                <div className={styles.cardMain}>
                                    <div className={styles.avatar}>
                                        {talent.name ? talent.name.substring(0, 2).toUpperCase() : '?'}
                                    </div>
                                    <div className={styles.talentInfo}>
                                        <span className={styles.talentName}>{talent.name}</span>
                                        <span className={styles.talentHeadline}>{talent.headline || 'Sem título definido'}</span>
                                    </div>
                                </div>

                                <div className={styles.cardActions}>
                                    <span
                                        className={styles.statusBadge}
                                        style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}
                                    >
                                        {statusInfo.text}
                                    </span>

                                    {talent.status === 'REJECTED' && (
                                        <button
                                            className={styles.reconsiderBtn}
                                            onClick={(e) => handleReconsiderClick(e, talent)}
                                        >
                                            Reconsiderar
                                        </button>
                                    )}

                                    <span className={styles.arrowIcon}>→</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {showAddModal && (
                <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>Adicionar Candidato</h3>
                        <p className={styles.modalSub}>Capture um novo perfil diretamente do LinkedIn:</p>

                        <div className={styles.modalActions}>
                            <button
                                className={styles.modalBtnPrimary}
                                onClick={() => { setShowAddModal(false); if (onAddFromMatch) onAddFromMatch(); }}
                            >
                                🚀 Capturar do LinkedIn
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
