import React, { useState } from 'react';
import styles from './EssentialFailureModal.module.css';
import { FaExclamationTriangle, FaCheckCircle, FaTimesCircle, FaRobot, FaLightbulb } from 'react-icons/fa';

const EssentialFailureModal = ({ 
  isOpen, 
  onClose, 
  profile, 
  onReconsider, 
  onReject 
}) => {
  const [feedback, setFeedback] = useState('');

  if (!isOpen || !profile) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <FaExclamationTriangle />
          </div>
          <div className={styles.titleGroup}>
            <h3>Critério Imprescindível Não Atendido</h3>
            <p>{profile.name}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        <div className={styles.content}>
          <div className={styles.aiReasoning}>
             <div className={styles.aiHeader}>
                <FaRobot />
                <span>Explicação da IA</span>
             </div>
             <div className={styles.tagLabel}>
                Tag: <strong>{profile.essentialTag || 'Sem Tag'}</strong>
             </div>
             <p className={styles.justification}>
                {profile.essentialJustification || 'A IA identificou que este candidato não atende a um requisito mandatório da vaga.'}
             </p>
          </div>

          <div className={styles.feedbackSection}>
            <div className={styles.feedbackLabel}>
              <FaLightbulb />
              <span>Deseja reconsiderar? Explique o motivo para a IA aprender:</span>
            </div>
            <textarea 
              className={styles.textarea}
              placeholder="Ex: O candidato possui experiência equivalente em outra tecnologia..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.actions}>
          <button 
            className={styles.rejectBtn} 
            onClick={() => onReject(profile)}
          >
            <FaTimesCircle /> Confirmar Rejeição
          </button>
          <button 
            className={styles.reconsiderBtn} 
            onClick={() => onReconsider(profile, feedback)}
          >
            <FaCheckCircle /> Reconsiderar Candidato
          </button>
        </div>
      </div>
    </div>
  );
};

export default EssentialFailureModal;
