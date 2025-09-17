import React from 'react';
import styles from './DashboardView.module.css';

// Ícone de exemplo (pode usar uma lib como react-icons)
const ArrowRightIcon = () => <svg /* ... */ />;

const DashboardView = ({ onSelectMenu }) => {
  const menuItems = [
    { id: 'analyze', label: 'Analisar Perfil Atual' },
    { id: 'edit', label: 'Editar Talento Existente' },
    { id: 'delete', label: 'Excluir Talento' },
    { id: 'settings', label: 'Configurações' },
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h3>Painel de Controle</h3>
        <p>Selecione uma ação para continuar.</p>
      </header>
      <nav className={styles.menu}>
        {menuItems.map(item => (
          <button 
            key={item.id} 
            className={styles.menuItem}
            onClick={() => onSelectMenu(item.id)}
          >
            <span>{item.label}</span>
            <span className={styles.arrow}>→</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default DashboardView;