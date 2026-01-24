// src/views/Manage/TalentProfileView.jsx

import React, { useState } from 'react';
import styles from './TalentProfileView.module.css';
import Header from '../../components/Header/Header';
import EditTalentModal from '../../components/Modals/EditTalentModal';

// Ícones
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
);
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
);
const PlusCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
);

import TalentMatchDisplay from '../../components/TalentMatchDisplay/TalentMatchDisplay';
import TalentFullProfile from '../../components/TalentFullProfile/TalentFullProfile';

// MODIFICADO: Adicionadas novas props para lidar com ações de talento e candidatura
const TalentProfileView = ({ talent, onBack, onEditTalent, onDeleteTalent, onAddNewApplication, onDeleteApplication }) => {
  const [activeTab, setActiveTab] = useState('info'); // 'info', 'match', 'profile'
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleSaveEdit = (updatedData) => {
    // onEditTalent agora espera o ID do talento e os dados
    onEditTalent(talent.id, updatedData);
    setIsEditModalOpen(false);
  };

  const confirmDeleteTalent = () => {
    if (window.confirm(`Tem certeza que deseja excluir o perfil de ${talent.name}? Esta ação não pode ser desfeita e removerá o talento de todas as vagas.`)) {
      onDeleteTalent(talent.id); // Chama a função passada via props
    }
  };

  const confirmDeleteApplication = (applicationId) => {
    // A confirmação para exclusão de candidatura já está no Popup.jsx
    onDeleteApplication(applicationId, talent.id); // Passa o ID da candidatura e do talento
  };

  return (
    <div className={styles.container}>
      <Header
        title="Perfil do Talento"
        subtitle={talent.headline || 'Sem título definido'}
        onBack={onBack}
      />

      {/* Navegação por Abas */}
      <div className={styles.tabs} style={{ padding: '0 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '24px' }}>
        <button
          onClick={() => setActiveTab('info')}
          style={{
            padding: '12px 0',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'info' ? '2px solid #2563eb' : '2px solid transparent',
            color: activeTab === 'info' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'info' ? '600' : '500',
            cursor: 'pointer'
          }}
        >
          Info Geral
        </button>
        <button
          onClick={() => setActiveTab('match')}
          style={{
            padding: '12px 0',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'match' ? '2px solid #2563eb' : '2px solid transparent',
            color: activeTab === 'match' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'match' ? '600' : '500',
            cursor: 'pointer'
          }}
        >
          Match AI
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          style={{
            padding: '12px 0',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'profile' ? '2px solid #2563eb' : '2px solid transparent',
            color: activeTab === 'profile' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'profile' ? '600' : '500',
            cursor: 'pointer'
          }}
        >
          Perfil Completo
        </button>
      </div>

      <main className={styles.profileContent}>
        {activeTab === 'info' && (
          <section className={styles.profileSection}>
            <div className={styles.profileHeader}>
              {/* Foto do talento (se houver, usar <img src={talent.photo} />) */}
              <div className={styles.avatar}>
                {talent.name ? talent.name.substring(0, 2) : '?'}
              </div>
              <div className={styles.profileInfo}>
                <h3 className={styles.name}>{talent.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <p className={styles.headline} style={{ margin: 0 }}>{talent.headline}</p>
                  {talent.status === 'REJECTED' && (
                    <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>REJEITADO</span>
                  )}
                </div>
                {talent.email && <p className={styles.contactInfo}>Email: {talent.email}</p>}
                {talent.phone && <p className={styles.contactInfo}>Telefone: {talent.phone}</p>}
                {talent.location && <p className={styles.contactInfo}>Localização: {talent.location}</p>}
                {talent.linkedinUsername && <p className={styles.contactInfo}>LinkedIn: <a href={`https://www.linkedin.com/in/${talent.linkedinUsername}/`} target="_blank" rel="noopener noreferrer">{talent.linkedinUsername}</a></p>}
              </div>
            </div>

            <div className={styles.profileActions}>
              <button onClick={() => setIsEditModalOpen(true)} className={styles.actionButton}>
                <EditIcon /> Editar Dados
              </button>
              {talent.status === 'REJECTED' && (
                <button
                  onClick={() => onAddNewApplication(talent.id)}
                  className={styles.actionButton}
                  style={{ backgroundColor: '#10b981', color: 'white', border: 'none' }}
                >
                  ✨ Reconsiderar (Aplicar)
                </button>
              )}
              <button onClick={confirmDeleteTalent} className={styles.deleteButton}>
                <TrashIcon /> Excluir Talento
              </button>
            </div>

            <div className={styles.appliedJobs}>
              <div className={styles.listHeader}>
                <h4>Vagas Aplicadas</h4>
                {/* Chama onAddNewApplication passando o ID do talento atual */}
                <button onClick={() => onAddNewApplication(talent.id)} className={styles.addButton}>
                  <PlusCircleIcon /> Adicionar à Vaga
                </button>
              </div>
              <div className={styles.jobList}>
                {talent.appliedJobs && talent.appliedJobs.length > 0 ? (
                  talent.appliedJobs.map(app => (
                    <div key={app.id} className={styles.jobListItem}>
                      <div className={styles.jobInfo}>
                        <span className={styles.jobName}>{app.jobName}</span>
                        <span className={styles.applicationStatus}>{app.status}</span>
                      </div>
                      <button
                        onClick={() => confirmDeleteApplication(app.id)}
                        className={styles.deleteApplicationButton}
                        title="Remover candidatura desta vaga"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className={styles.emptyJobs}>Nenhuma vaga aplicada ainda.</p>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'match' && (
          <TalentMatchDisplay matchData={talent.aiReview ? { aiReview: talent.aiReview, matchScore: talent.matchScore } : null} />
        )}

        {activeTab === 'profile' && (
          <TalentFullProfile profileData={talent.data || talent} />
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