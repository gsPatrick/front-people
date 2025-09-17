import React from 'react';
import styles from './Header.module.css';

const Header = ({ title, subtitle, onBack }) => {
  return (
    <header className={styles.header}>
      {onBack && (
        <button onClick={onBack} className={styles.backButton}>
          ←
        </button>
      )}
      <div className={styles.titleContainer}>
        <h2 className={styles.title}>{title}</h2>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
    </header>
  );
};

export default Header;