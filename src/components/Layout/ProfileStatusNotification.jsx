// CRIE O ARQUIVO: src/components/Layout/ProfileStatusNotification.jsx

import React from 'react';
import styles from './ProfileStatusNotification.module.css';
import { BsCheckCircleFill } from 'react-icons/bs';

const ProfileStatusNotification = ({ status, onGoToProfile }) => {
  if (!status || !status.exists) {
    return null;
  }

  const handleViewProfile = () => {
    if (status.talent) {
      onGoToProfile(status.talent);
    }
  };

  return (
    <div className={styles.notificationBar}>
      <div className={styles.icon}>
        <BsCheckCircleFill />
      </div>
      <div className={styles.textContainer}>
        <span className={styles.title}>Perfil Encontrado!</span>
        <span className={styles.subtitle}>
          {status.talent?.name || 'Este talento'} já está no seu banco de dados.
        </span>
      </div>
      <button onClick={handleViewProfile} className={styles.actionButton}>
        Ver Perfil
      </button>
    </div>
  );
};

export default ProfileStatusNotification;