// CRIE O ARQUIVO: src/views/Auth/AccessDeniedView.jsx

import React from 'react';
import styles from './AccessDeniedView.module.css';

const AccessDeniedView = ({ onGoToLogin, title, message }) => {
    return (
        <div className={styles.container}>
            <div className={styles.icon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            </div>
            <h2 className={styles.title}>{title || 'Acesso Negado'}</h2>
            <p className={styles.message}>
                {message || 'Suas credenciais estão incorretas ou sua sessão expirou. Por favor, tente fazer o login novamente.'}
            </p>
            <button onClick={onGoToLogin} className={styles.loginButton}>
                Voltar para o Login
            </button>
        </div>
    );
};

export default AccessDeniedView;