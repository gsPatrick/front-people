import React, { useState } from 'react';
import styles from './EditTalentModal.module.css';

const EditTalentModal = ({ talent, onSave, onClose }) => {
  const [name, setName] = useState(talent.name);
  const [headline, setHeadline] = useState(talent.headline);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...talent, name, headline });
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3>Editar Perfil do Talento</h3>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.inputGroup}>
            <label htmlFor="talent-name">Nome Completo</label>
            <input
              id="talent-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do Talento"
              className={styles.input}
              required
            />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="talent-headline">Título/Headline</label>
            <input
              id="talent-headline"
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Ex: Engenheiro de Software Sênior"
              className={styles.input}
              required
            />
          </div>
          <div className={styles.modalActions}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancelar
            </button>
            <button type="submit" className={styles.saveButton}>
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTalentModal;