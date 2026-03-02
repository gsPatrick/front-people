import React from 'react';
import styles from './JobsDashboardView.module.css';
import Header from '../../components/Header/Header';
import { MdSync, MdSyncProblem, MdCheckCircle, MdEdit } from 'react-icons/md';

// Ícones
const UsersIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>);
const AreaIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>);
const SlaIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>);

const JOB_STATUSES = [
  { value: 'open', label: 'Aberta' },
  { value: 'paused', label: 'Congelada' },
  { value: 'closed', label: 'Fechada' },
  { value: 'canceled', label: 'Cancelada' }
];

const JobsDashboardView = ({
  jobsData,
  onSelectJob,
  onBack,
  isSelectionMode = false,
  activeStatusFilter,
  onFilterChange,
  onCreateJob,
  onEditJob, // Prop para edição
  onSyncJob, // Prop para sincronização
  onDeleteJob, // Prop para exclusão
  customTitle,
  customSubtitle
}) => {
  const title = customTitle || (isSelectionMode ? "Selecione a Vaga" : "Dashboard de Vagas");
  const subtitle = customSubtitle || (isSelectionMode ? "Associe o candidato à vaga." : `${jobsData.totalJobs || 0} vagas com este status`);

  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [newJobTitle, setNewJobTitle] = React.useState('');
  const [newJobDescription, setNewJobDescription] = React.useState('');

  const jobsToDisplay = Array.isArray(jobsData.jobs) ? jobsData.jobs : [];

  const handleSyncClick = (e, job) => {
    e.stopPropagation();
    if (onSyncJob) onSyncJob(job.id);
  };

  const handleEditClick = (e, job) => {
    e.stopPropagation();
    if (onEditJob) onEditJob(job);
  };

  const handleDeleteClick = (e, job) => {
    e.stopPropagation();
    if (onDeleteJob) onDeleteJob(job.id, activeStatusFilter);
  };

  return (
    <div className={styles.container}>
      <Header title={title} subtitle={subtitle} onBack={onBack && isSelectionMode ? onBack : null} />

      {!isSelectionMode && (
        <div className={styles.filtersBar}>
          <div className={styles.statusFilters}>
            {JOB_STATUSES.map(status => (
              <button
                key={status.value}
                className={`${styles.filterButton} ${activeStatusFilter === status.value ? styles.active : ''}`}
                onClick={() => onFilterChange(status.value)}
              >
                {status.label}
              </button>
            ))}
          </div>
          <div className={styles.actionButtons}>
            <button
              className={styles.createJobButton}
              onClick={() => onCreateJob ? onCreateJob() : setShowCreateModal(true)}
            >
              + Nova Vaga
            </button>
          </div>
        </div>
      )}

      <main className={styles.jobList}>
        {jobsToDisplay.length > 0 ? (
          jobsToDisplay.map(job => (
            <div key={job.id} className={styles.jobCardWrapper}>
              <button className={styles.jobCard} onClick={() => onSelectJob(job)}>
                <div className={styles.jobInfo}>
                  <div className={styles.jobTitleRow}>
                    <span className={styles.jobName}>{job.name}</span>
                    <div className={styles.sourceBadges}>
                      {job.source === 'INHIRE' ? (
                        <span className={`${styles.sourceBadge} ${styles.sourceCloud}`} title="Sincronizada do InHire">InHire</span>
                      ) : (
                        <span className={`${styles.sourceBadge} ${styles.sourceLocal}`} title="Vaga Local">Local</span>
                      )}
                    </div>
                    <div className={styles.jobActionsRow}>
                      {job.source === 'LOCAL' && job.syncStatus !== 'SYNCHRONIZED' && (
                        <button 
                          className={styles.syncButton}
                          onClick={(e) => handleSyncClick(e, job)}
                          title="Sincronizar com InHire"
                        >
                          <MdSync /> Sincronizar
                        </button>
                      )}
                      <button 
                        className={styles.editButton}
                        onClick={(e) => handleEditClick(e, job)}
                        title="Editar Vaga"
                      >
                        <MdEdit /> Editar
                      </button>
                      {job.source === 'LOCAL' && (
                        <button 
                          className={styles.deleteButton}
                          onClick={(e) => handleDeleteClick(e, job)}
                          title="Excluir Vaga"
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  </div>
                  <div className={styles.jobDetails}>
                    <span className={styles.detailItem}><AreaIcon /> {job.area?.name || 'Geral'}</span>
                    <span className={styles.detailItem}><UsersIcon /> {job.activeTalents || 0} Ativos</span>
                    <span className={styles.detailItem}><SlaIcon /> SLA: {job.slaDaysGoal || 30} dias</span>
                  </div>
                </div>
                <span className={styles.arrow}>→</span>
              </button>
            </div>
          ))
        ) : (
          <p className={styles.emptyState}>Nenhuma vaga encontrada para os filtros selecionados.</p>
        )}
      </main>

      {/* MODAL DE CRIAÇÃO (Fallback se onCreateJob não redirecionar) */}
      {showCreateModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Nova Vaga Local</h3>
            <div className={styles.modalBody}>
               <input
                type="text"
                placeholder="Título da Vaga (ex: Desenvolvedor React)"
                value={newJobTitle}
                onChange={(e) => setNewJobTitle(e.target.value)}
                className={styles.modalInput}
              />
              <textarea
                placeholder="Descrição breve (opcional)"
                value={newJobDescription}
                onChange={(e) => setNewJobDescription(e.target.value)}
                className={styles.modalTextarea}
              />
            </div>
            <div className={styles.modalActions}>
              <button onClick={() => setShowCreateModal(false)} className={styles.cancelButton}>Cancelar</button>
              <button
                onClick={() => {
                   if (onCreateJob) onCreateJob({ name: newJobTitle, description: newJobDescription });
                   setShowCreateModal(false);
                }}
                className={styles.confirmButton}
              >
                Criar Vaga
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobsDashboardView;