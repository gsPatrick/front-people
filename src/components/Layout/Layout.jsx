import React from 'react';
import styles from './Layout.module.css';
// Ícones atualizados com BsClipboardCheck e BsBullseye
import { BsBriefcaseFill, BsLayoutSidebarInsetReverse, BsLayoutSidebarInset, BsBoxArrowUpRight, BsLinkedin, BsClipboardCheck, BsBullseye } from 'react-icons/bs';
import { IoPeopleSharp, IoSettingsSharp, IoLogOutOutline } from 'react-icons/io5';

// Adicionada a prop activeMatchScorecardName
const Layout = ({ activeView, onNavigate, children, isSidebarCollapsed, onToggleSidebar, onOpenInTab, onCaptureProfile, onLogout, activeMatchScorecardName }) => {

  const navItems = [
    { id: 'dashboard_jobs', label: 'Vagas', icon: <BsBriefcaseFill /> },
    { id: 'dashboard_talents', label: 'Talentos', icon: <IoPeopleSharp /> },
    { id: 'scorecard_hub', label: 'Scorecards', icon: <BsClipboardCheck /> },
    { 
      id: 'match_hub', 
      label: 'Match', 
      icon: <BsBullseye />,
      // Sub-label dinâmico que mostra o scorecard ativo
      subLabel: activeMatchScorecardName || 'Nenhum scorecard ativo'
    },
    { id: 'settings', label: 'Configurações', icon: <IoSettingsSharp /> },
  ];

  return (
    <div className={`${styles.layout} ${isSidebarCollapsed ? styles.collapsed : ''}`}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logoContainer}>
            <img src="/logo.png" alt="Logo" className={styles.logoImage} />
          </div>
          <button 
            onClick={onToggleSidebar}
            className={styles.toggleButton} 
            title={isSidebarCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            {isSidebarCollapsed ? <BsLayoutSidebarInset /> : <BsLayoutSidebarInsetReverse />}
          </button>
        </div>
        <nav className={styles.nav}>
          {onCaptureProfile && (
            <button
              className={`${styles.navItem} ${styles.captureButton}`}
              onClick={onCaptureProfile}
              title="Capturar Perfil do LinkedIn"
            >
              <span className={styles.navIcon}><BsLinkedin /></span>
              <span className={styles.navLabel}>Capturar Perfil</span>
            </button>
          )}

          {navItems.map(item => (
            <button
              key={item.id}
              className={`${styles.navItem} ${activeView === item.id ? styles.active : ''}`}
              onClick={() => onNavigate(item.id)}
              title={item.label}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <div className={styles.navLabelContainer}>
                <span className={styles.navLabel}>{item.label}</span>
                {/* Renderiza o sub-label se ele existir e a sidebar não estiver recolhida */}
                {item.subLabel && !isSidebarCollapsed && (
                  <span className={styles.navSubLabel}>{item.subLabel}</span>
                )}
              </div>
            </button>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
            {onOpenInTab && (
                <button
                    className={styles.openInTabButton}
                    onClick={onOpenInTab}
                    title="Abrir em nova aba"
                >
                    <span className={styles.navIcon}><BsBoxArrowUpRight /></span>
                    <span className={styles.navLabel}>Sempre Aberto</span>
                </button>
            )}
            <button
                className={styles.logoutButton}
                onClick={onLogout}
                title="Sair da conta"
            >
                <span className={styles.navIcon}><IoLogOutOutline /></span>
                <span className={styles.navLabel}>Sair</span>
            </button>
        </div>
      </aside>
      <main className={styles.content}>
        {children}
      </main>
    </div>
  );
};

export default Layout;