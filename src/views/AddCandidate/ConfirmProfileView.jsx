// src/views/AddCandidate/ConfirmProfileView.jsx

import React from 'react';
import styles from './ConfirmProfileView.module.css';

// Ícones
const UserPlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="23" y2="17"/><line x1="20" y1="14" x2="26" y2="14"/></svg>);
const EditIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>);
const BriefcaseIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>);


const ConfirmProfileView = ({ profileContext, onConfirmCreation, onGoToProfile, onGoToDashboard }) => {
  
  if (!profileContext) {
    return <div>Carregando informações do perfil...</div>;
  }

  const { exists, talent, profileData } = profileContext;
  const candidateName = exists ? talent.name : profileData.name;
  
  const handleConfirm = () => {
    if (exists) {
      onGoToProfile(talent); // Passa o objeto do talento para onGoToProfile no componente pai
    } else {
      onConfirmCreation(profileData);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.iconContainer}>
        {exists ? <EditIcon /> : <UserPlusIcon />}
      </div>
      
      <p className={styles.prompt}>
        {exists ? "Este talento já está na sua base:" : "O perfil de"}
      </p>
      
      <h2 className={styles.candidateName}>{candidateName}</h2>
      
      <button onClick={handleConfirm} className={styles.confirmButton}>
        <span className={styles.buttonIcon}>
          {exists ? <EditIcon /> : <UserPlusIcon />}
        </span> 
        {exists ? 'Ver / Editar Perfil' : 'Adicionar à InHire'}
      </button>

      <button onClick={onGoToDashboard} className={styles.secondaryButton}>
        <BriefcaseIcon /> Ir para o Dashboard
      </button>
    </div>
  );
};

export default ConfirmProfileView;