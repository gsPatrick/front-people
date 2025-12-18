import React from 'react';
import styles from './ConfirmProfileView.module.css';

// Ícones
const UserPlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="23" y2="17"/><line x1="20" y1="14" x2="26" y2="14"/></svg>);
const EditIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>);
const RefreshIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>);

// A função agora recebe a prop 'onUpdateRequest'
const ConfirmProfileView = ({ profileContext, onConfirmCreation, onGoToProfile, onGoToDashboard, onUpdateRequest }) => {
  
  if (!profileContext) {
    return <div>Carregando informações do perfil...</div>;
  }

  const { exists, talent, profileData } = profileContext;
  const candidateName = exists ? talent.name : profileData.name;
  
  const handleDefaultAction = () => {
    if (exists) {
      onGoToProfile(talent);
    } else {
      onConfirmCreation(profileData);
    }
  };

  // ==========================================================
  // ⭐ AÇÃO DE ATUALIZAR SIMPLIFICADA ⭐
  // Agora, simplesmente chama a função onUpdateRequest.
  // ==========================================================
  const handleUpdateAction = () => {
    if (exists) {
      onUpdateRequest();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.iconContainer}>
        {exists ? <EditIcon /> : <UserPlusIcon />}
      </div>
      
      <p className={styles.prompt}>
        {exists ? "Este talento já está na sua base:" : "Perfil analisado:"}
      </p>
      
      <h2 className={styles.candidateName}>{candidateName}</h2>
      
      <button onClick={handleDefaultAction} className={styles.confirmButton}>
        {exists ? 'Ver Perfil na InHire' : 'Adicionar à Vaga'}
      </button>

      {exists && (
        <button onClick={handleUpdateAction} className={styles.secondaryButton}>
          <RefreshIcon /> Atualizar Dados do Perfil
        </button>
      )}

      {!exists && (
        <button onClick={onGoToDashboard} className={styles.secondaryButton}>
          Ir para o Dashboard
        </button>
      )}
    </div>
  );
};

export default ConfirmProfileView;