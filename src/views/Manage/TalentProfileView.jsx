import React, { useState } from 'react';
import styles from './TalentProfileView.module.css';
import Header from '../../components/Header/Header';
import EditTalentModal from '../../components/Modals/EditTalentModal';
import TalentFullProfile from '../../components/TalentFullProfile/TalentFullProfile';
import HistoricalScorecard from '../../components/TalentHistory/HistoricalScorecard';
import { FaUser, FaHistory, FaBriefcase, FaEdit, FaTrash, FaPlusCircle, FaExternalLinkAlt } from 'react-icons/fa';

const TalentProfileView = ({ 
  talent, 
  onBack, 
  onEditTalent, 
  onDeleteTalent, 
  onAddNewApplication, 
  onDeleteApplication 
}) => {
  const [activeTab, setActiveTab] = useState('perfil'); // 'perfil', 'historico', 'vagas'
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleSaveEdit = (updatedData) => {
    onEditTalent(talent.id, updatedData);
    setIsEditModalOpen(false);
  };

  const confirmDeleteTalent = () => {
    if (window.confirm(`Tem certeza que deseja excluir o perfil de ${talent.name}? Esta ação não pode ser desfeita.`)) {
      onDeleteTalent(talent.id);
    }
  };

  const confirmDeleteApplication = (applicationId) => {
    if (window.confirm("Remover este talento desta vaga?")) {
      onDeleteApplication(applicationId, talent.id);
    }
  };

  // Histórico completo de eventos (Scorecards + Mudanças de Status)
  const fullHistory = (talent.appliedJobs || [])
    .map(app => ({
      ...app,
      eventDate: app.evaluationResult?.evaluatedAt || app.updatedAt || app.createdAt
    }))
    .sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));

  return (
    <div className={styles.container}>
      <Header
        title="Perfil do Talento"
        subtitle={talent.headline || 'Candidato'}
        onBack={onBack}
      />

      <div className={styles.tabsContainer}>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tabButton} ${activeTab === 'perfil' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('perfil')}
          >
            <FaUser /> Perfil
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'historico' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('historico')}
          >
            <FaHistory /> Histórico ({fullHistory.length})
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'vagas' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('vagas')}
          >
            <FaBriefcase /> Vagas ({talent.appliedJobs?.length || 0})
          </button>
        </div>
      </div>

      <main className={styles.profileContent}>
        {activeTab === 'perfil' && (
          <div className={styles.tabContent}>
            <div className={styles.profileHeaderSection}>
              <div className={styles.avatar}>
                {talent.name ? talent.name.substring(0, 2) : '?'}
              </div>
              <div className={styles.mainInfo}>
                <h2 className={styles.talentName}>{talent.name}</h2>
                <p className={styles.talentHeadline}>{talent.headline}</p>
                <div className={styles.tags}>
                   {talent.status === 'REJECTED' && <span className={styles.badgeRejected}>REJEITADO</span>}
                   {talent.location && <span className={styles.infoTag}>{talent.location}</span>}
                </div>
              </div>
              <div className={styles.topActions}>
                <button onClick={() => setIsEditModalOpen(true)} className={styles.outlineButton}>
                  <FaEdit /> Editar
                </button>
                <button onClick={confirmDeleteTalent} className={styles.dangerButton}>
                  <FaTrash /> Excluir
                </button>
              </div>
            </div>

            <div className={styles.contactDetails}>
              {talent.email && <div className={styles.contactItem}><strong>Email:</strong> {talent.email}</div>}
              {talent.phone && <div className={styles.contactItem}><strong>Telefone:</strong> {talent.phone}</div>}
              {talent.linkedinUsername && (
                <div className={styles.contactItem}>
                  <strong>LinkedIn:</strong> 
                  <a href={`https://www.linkedin.com/in/${talent.linkedinUsername}/`} target="_blank" rel="noopener noreferrer">
                    {talent.linkedinUsername} <FaExternalLinkAlt size={10} />
                  </a>
                </div>
              )}
            </div>

            <div className={styles.fullProfileWrapper}>
               <h3 className={styles.sectionTitle}>Experiência e Formação</h3>
               <TalentFullProfile profileData={talent.data || talent} />
            </div>
          </div>
        )}

        {activeTab === 'historico' && (
          <div className={styles.tabContent}>
            <h3 className={styles.sectionTitle}>Histórico de Candidaturas</h3>
            {fullHistory.length > 0 ? (
              <div className={styles.historyList}>
                {fullHistory.map((app, index) => (
                  app.evaluationResult ? (
                    <HistoricalScorecard key={index} evaluationResult={app.evaluationResult} />
                  ) : (
                    <div key={index} className={styles.simpleHistoryCard}>
                      <div className={styles.historyIcon}>
                        <FaHistory />
                      </div>
                      <div className={styles.historyBody}>
                        <div className={styles.historyRow}>
                           <span className={styles.historyJob}>{app.jobName}</span>
                           <span className={styles.historyDate}>
                             {new Date(app.eventDate).toLocaleDateString('pt-BR')}
                           </span>
                        </div>
                        <div className={styles.historyStatus}>
                          Status alterado para: <span className={`${styles.statusBadge} ${styles['status_' + (app.status || 'applied').toLowerCase().replace(' ', '_')]}`}>
                            {app.status || 'Inscrito'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <FaHistory size={48} />
                <p>Este talento ainda não possui histórico de candidaturas ou avaliações.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'vagas' && (
          <div className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Inscrições Atuais</h3>
              <button 
                onClick={() => onAddNewApplication(talent.id)} 
                className={styles.addButton}
              >
                <FaPlusCircle /> Adicionar à Vaga
              </button>
            </div>
            
            <div className={styles.jobList}>
              {talent.appliedJobs && talent.appliedJobs.length > 0 ? (
                talent.appliedJobs.map(app => (
                  <div key={app.id} className={styles.jobCard}>
                    <div className={styles.jobCardIcon}>
                       <FaBriefcase />
                    </div>
                    <div className={styles.jobCardMain}>
                      <span className={styles.jobCardTitle}>{app.jobName || `Vaga ID: ${app.jobId?.substring(0,8)}...`}</span>
                      <div className={styles.jobCardFooter}>
                        <span className={`${styles.statusBadge} ${styles['status_' + (app.status || 'applied').toLowerCase().replace(' ', '_')]}`}>
                           {app.status || 'Inscrito'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => confirmDeleteApplication(app.id)}
                      className={styles.iconButtonDanger}
                      title="Remover candidatura"
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>
                  <FaBriefcase size={48} />
                  <p>Este talento não está inscrito em nenhuma vaga no momento.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {isEditModalOpen && (
        <EditTalentModal
          talent={talent}
          onSave={handleSaveEdit}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </div>
  );
};

export default TalentProfileView;