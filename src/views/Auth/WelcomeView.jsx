// CRIE O ARQUIVO: src/views/Auth/WelcomeView.jsx

import React from 'react';
import styles from './WelcomeView.module.css';

const WelcomeView = ({ userName }) => {
  // Pega o primeiro nome do usuário para uma saudação mais pessoal
  const firstName = userName ? userName.split(' ')[0] : 'Usuário';

  return (
    <div className={styles.container}>
      <img src="/logo.png" alt="Logo" className={styles.logo} />
      <h1 className={styles.welcomeText}>
        Bem-vindo, {firstName}!
      </h1>
    </div>
  );
};

export default WelcomeView;