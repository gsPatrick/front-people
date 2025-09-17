// src/components/Modals/EditInfoView.jsx

import React from 'react';
import styles from './FormStyles.module.css'; // Usa o CSS compartilhado

const EditInfoView = ({ candidate, formData, handleChange }) => {
    return (
        <div className={styles.formContainer}>
            {/* O campo de Pretensão Salarial foi removido daqui */}
            {/* 
            <div className={styles.inputGroup}>
                <label>Pretensão salarial</label>
                <input type="text" placeholder="R$ 0,00" name="salary" onChange={handleChange} />
            </div>
            */}
             <div className={styles.inputGroup}>
                <label>E-mail</label>
                <input type="email" name="email" value={formData.email || ''} onChange={handleChange} placeholder="Digite o e-mail" />
            </div>
            <div className={styles.inputGroup}>
                <label>Fonte atual *</label>
                <select name="source" onChange={handleChange}>
                    <option>Hunting</option>
                </select>
            </div>
             <div className={styles.inputGroup}>
                <label>Telefone</label>
                <input type="tel" name="phone" value={formData.phone || ''} onChange={handleChange} placeholder="+55" />
            </div>
             <div className={styles.inputGroup}>
                <label>Localização</label>
                <input type="text" name="location" value={formData.location || ''} onChange={handleChange} placeholder="Digite a localização" />
            </div>
        </div>
    );
};

export default EditInfoView;