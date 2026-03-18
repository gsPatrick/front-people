// CandidateListView.jsx - Layout Moderno e Minimalista
import React, { useState, useEffect, useCallback } from 'react';
import styles from './CandidateListView.module.css';
import * as api from '../../services/api.service';
import Header from '../../components/Header/Header';

const CandidateListView = ({ onSelectCandidate, onBack, onAddFromMatch, onReconsider, jobId }) => {
    const [talents, setTalents] = useState([]);
    const [jobs, setJobs] = useState([]); // Nova lista de vagas para o filtro
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState(jobId ? 'ACTIVE' : 'ALL'); // Status da candidatura/perfil
    const [selectedJobId, setSelectedJobId] = useState(jobId || ''); // JobID selecionado no filtro
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);

    const loadJobs = useCallback(async () => {
        try {
            const result = await api.fetchJobsPaginated(1, 100, 'all');
            if (result && result.jobs) {
                setJobs(result.jobs);
            }
        } catch (error) {
            console.error("Erro ao carregar vagas:", error);
        }
    }, []);

    const loadTalents = useCallback(async () => {
        setLoading(true);
        try {
            const filters = {
                jobId: selectedJobId,
                status: filterStatus !== 'ALL' ? filterStatus : undefined,
                startDate,
                endDate,
                searchTerm
            };
            const result = await api.fetchAllTalents(1, 100, filters);
            if (result.success && result.data) {
                setTalents(result.data.talents);
            }
        } catch (error) {
            console.error("Erro ao carregar talentos:", error);
        } finally {
            setLoading(false);
        }
    }, [selectedJobId, filterStatus, startDate, endDate, searchTerm]);

    useEffect(() => {
        loadJobs();
    }, [loadJobs]);

    useEffect(() => {
        loadTalents();
    }, [loadTalents]);

    const getStatusStyle = (status) => {
        switch (status) {
            case 'REJECTED':
                return { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', text: 'Rejeitado' };
            case 'ACTIVE':
            case 'Applied':
            case 'Inscrito':
                return { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', text: 'Ativo' };
            case 'NEW':
                return { bg: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', text: 'Novo' };
            default:
                return { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', text: status || 'Ativo' };
        }
    };

    const filteredTalents = Array.isArray(talents) ? talents : [];

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

                <div className={styles.filterGroup}>
                    <select
                        className={styles.filterSelect}
                        value={selectedJobId}
                        onChange={(e) => setSelectedJobId(e.target.value)}
                    >
                        <option value="">Todas as Vagas</option>
                        {jobs.map(j => (
                            <option key={j.id} value={j.id}>{j.title || j.name}</option>
                        ))}
                    </select>

                    <select
                        className={styles.filterSelect}
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="ALL">Status (Todos)</option>
                        <option value="Applied">Novo</option>
                        <option value="Screened">Triagem</option>
                        <option value="Interview">Entrevista</option>
                        <option value="Offered">Proposta</option>
                        <option value="Hired">Contratado</option>
                        <option value="REJECTED">Rejeitado</option>
                    </select>

                    <div className={styles.dateFilter}>
                        <input 
                            type="date" 
                            className={styles.dateInput}
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            title="De"
                        />
                        <span className={styles.dateDivider}>atê</span>
                        <input 
                            type="date" 
                            className={styles.dateInput}
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            title="Até"
                        />
                    </div>
                </div>

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
                        // Prioriza o status global de REJEITADO se houver
                        const status = talent.status === 'REJECTED' ? 'REJECTED' : (talent.lastStatus || talent.status);
                        const statusInfo = getStatusStyle(status);
                        const matchScore = talent.matchScore || 0;
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
                                        <div className={styles.nameRow}>
                                            <span className={styles.talentName}>{talent.name}</span>
                                            {matchScore > 0 && (
                                                <div className={styles.matchBadge} title="Score de Match IA">
                                                    {matchScore}%
                                                </div>
                                            )}
                                        </div>
                                        <span className={styles.talentHeadline}>{talent.headline || 'Sem título definido'}</span>
                                        <div className={styles.jobInfo}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px', opacity: 0.7 }}>
                                                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                                                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                                            </svg>
                                            {talent.primaryJobName}
                                        </div>
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
