import React, { useState } from 'react';
import styles from './LinkedInManualAddModal.module.css';
import { BsBriefcaseFill } from 'react-icons/bs'; // Ícone para vagas

const LinkedInManualAddModal = ({ talentName, onAddProfile, onClose, onGoToDashboard, mockJobs }) => {
  const [selectedJob, setSelectedJob] = useState(''); // Estado para a vaga selecionada

  const handleAdd = () => {
    if (!selectedJob) {
      alert('Por favor, selecione uma vaga para associar o candidato.');
      return;
    }
    onAddProfile(selectedJob); // Passa a vaga selecionada para a função de adicionar no Popup
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3>Adicionar Talento à InHire</h3>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.prompt}>O perfil de **{talentName}** não está na sua base de talentos.</p>
          <p className={styles.subtitle}>Modo Manual: Selecione uma vaga para iniciar a candidatura:</p>

          <div className={styles.inputGroup}>
            <label htmlFor="job-select">Vaga Associada</label>
            <div className={styles.selectWrapper}>
                <select 
                    id="job-select" 
                    value={selectedJob} 
                    onChange={(e) => setSelectedJob(e.target.value)} 
                    className={styles.select}
                >
                    <option value="">Selecione uma vaga...</option>
                    {Object.values(mockJobs).map(job => (
                        <option key={job.id} value={job.id}>{job.name}</option>
                    ))}
                </select>
                <BsBriefcaseFill className={styles.selectIcon} />
            </div>
          </div>

          <div className={styles.modalActions}>
            <button onClick={handleAdd} className={styles.primaryButton} disabled={!selectedJob}>
              Adicionar e Avaliar
            </button>
            <button onClick={onGoToDashboard} className={styles.secondaryButton}>
              Ver Meu Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinkedInManualAddModal;