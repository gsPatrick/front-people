// CRIE O ARQUIVO: src/views/Admin/Toast.jsx

import React, { useEffect } from 'react';
import styles from './Toast.module.css';

const Toast = ({ message, type = 'success', onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss();
        }, 3000); // O toast desaparece após 3 segundos

        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <div className={`${styles.toast} ${styles[type]}`}>
            <span className={styles.message}>{message}</span>
            <button onClick={onDismiss} className={styles.dismissButton}>×</button>
        </div>
    );
};

export default Toast;