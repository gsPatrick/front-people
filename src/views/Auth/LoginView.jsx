// COLE ESTE CÓDIGO NO ARQUIVO: src/views/Auth/LoginView.jsx

import React, { useState } from 'react';
import styles from './LoginView.module.css';
import { BsEyeFill, BsEyeSlashFill } from 'react-icons/bs'; // <-- Importa os ícones

const LoginView = ({ onLogin, error, isLoading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false); // <-- Estado para controlar a visibilidade

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className={styles.container}>
      <div className={styles.glow} />
      <img src="/logo.png" alt="Logo" className={styles.logo} />
      <h2 className={styles.title}>Bem-vindo de volta</h2>
      <p className={styles.subtitle}>Acesse sua conta para continuar.</p>
      
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>
        
        <div className={styles.inputGroup}>
          <label htmlFor="password">Senha</label>
          {/* Wrapper para posicionar o ícone */}
          <div className={styles.passwordWrapper}>
            <input
              id="password"
              type={isPasswordVisible ? 'text' : 'password'} // <-- Tipo dinâmico
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
            {/* Botão para alternar a visibilidade */}
            <button
              type="button"
              className={styles.togglePasswordButton}
              onClick={() => setIsPasswordVisible(prev => !prev)}
              aria-label="Mostrar ou esconder a senha"
            >
              {isPasswordVisible ? <BsEyeSlashFill /> : <BsEyeFill />}
            </button>
          </div>
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