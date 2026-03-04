import React, { useState, useEffect } from 'react';
import styles from './JobSelectionModal.module.css';
import { FaBriefcase, FaSearch, FaCheck, FaTimes } from 'react-icons/fa';
import * as api from '../../services/api.service';

const JobSelectionModal = ({ 
  isOpen, 
  onClose, 
  talent, 
  onSuccess 
}) => {
  const [jobs, setJobs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchJobs();
    }
  }, [isOpen]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await api.fetchJobs(1, 100, 'ACTIVE');
      // Filter out jobs where the talent is already applied (optional but good)
      setJobs(response.jobs || []);
    } catch (err) {
      console.error("Erro ao buscar vagas:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedJobId) return;
    setAdding(true);
    try {
      await api.addTalentToJob(talent.id, selectedJobId);
      onSuccess();
      onClose();
    } catch (err) {
      alert("Erro ao adicionar talento à vaga: " + (err.response?.data?.error || err.message));
    } finally {
      setAdding(false);
    }
  };

  if (!isOpen) return null;

  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.company?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>Adicionar a uma Vaga</h3>
          <button className={styles.closeBtn} onClick={onClose}><FaTimes /></button>
        </div>

        <div className={styles.searchBar}>
          <FaSearch className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Buscar vaga..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className={styles.jobList}>
          {loading ? (
            <div className={styles.loading}>Carregando vagas...</div>
          ) : filteredJobs.length > 0 ? (
            filteredJobs.map(job => (
              <div 
                key={job.id} 
                className={`${styles.jobItem} ${selectedJobId === job.id ? styles.selected : ''}`}
                onClick={() => setSelectedJobId(job.id)}
              >
                <div className={styles.jobInfo}>
                  <FaBriefcase className={styles.jobIcon} />
                  <div>
                    <div className={styles.jobTitle}>{job.title}</div>
                    <div className={styles.jobCompany}>{job.company?.name || 'Empresa Externa'}</div>
                  </div>
                </div>
                {selectedJobId === job.id && <FaCheck className={styles.checkIcon} />}
              </div>
            ))
          ) : (
            <div className={styles.empty}>Nenhuma vaga encontrada.</div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancelar</button>
          <button 
            className={styles.addBtn} 
            disabled={!selectedJobId || adding}
            onClick={handleAdd}
          >
            {adding ? 'Adicionando...' : 'Confirmar Seleção'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobSelectionModal;
