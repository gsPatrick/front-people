import React, { useState } from 'react';
import styles from './LoginView.module.css';
import * as api from '../../services/api.service'; // Importando o serviço mock

const LoginView = ({ onLoginSuccess, onLoginFail }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    
    setIsLoading(true);
    setError('');

    // Simulação de delay para a chamada da API
    const result = await new Promise(resolve => {
        setTimeout(async () => {
            const res = await api.login(email, password);
            resolve(res);
        }, 1000); // 1 segundo de delay
    });
    
    if (result.success) {
      onLoginSuccess();
    } else {
      setError(result.error);
      if (onLoginFail) onLoginFail(result.error);
    }
    setIsLoading(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.glow} />
      <h2 className={styles.title}>Bem-vindo</h2>
      <p className={styles.subtitle}>Acesse sua conta InHire para continuar.</p>
      
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label htmlFor="email" className={styles.label}>E-mail</label>
          <input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            disabled={isLoading}
          />
        </div>
        
        <div className={styles.inputGroup}>
          <label htmlFor="password" className={styles.label}>Senha</label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            disabled={isLoading}
          />
        </div>
        
        {error && <p className={styles.error}>{error}</p>}
        
        <button type="submit" className={styles.loginButton} disabled={isLoading}>
          {isLoading ? <span className={styles.loader}></span> : 'Conectar'}
        </button>
      </form>
    </div>
  );
};

export default LoginView;