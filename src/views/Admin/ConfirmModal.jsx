// CRIE O ARQUIVO: src/views/Admin/ConfirmModal.jsx

import React from 'react';
import styles from './ConfirmModal.module.css';

const ConfirmModal = ({ title, message, onConfirm, onCancel, confirmText = 'Confirmar', cancelText = 'Cancelar' }) => {
    return (
        <div className={styles.overlay} onClick={onCancel}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.content}>
                    <h3 className={styles.title}>{title}</h3>
                    <p className={styles.message}>{message}</p>
                </div>
                <div className={styles.actions}>
                    <button onClick={onCancel} className={styles.cancelButton}>
                        {cancelText}
                    </button>
                    <button onClick={onConfirm} className={styles.confirmButton}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;