import React, { useState } from 'react';
import styles from './Layout.module.css';
// Ícones atualizados com BsClipboardCheck e BsBullseye
import { BsBriefcaseFill, BsLayoutSidebarInsetReverse, BsLayoutSidebarInset, BsBoxArrowUpRight, BsLinkedin, BsClipboardCheck, BsBullseye, BsShieldLock } from 'react-icons/bs';
import { IoPeopleSharp, IoSettingsSharp, IoLogOutOutline, IoChatbubblesSharp, IoShieldCheckmarkSharp } from 'react-icons/io5';

// Adicionada a prop activeMatchScorecardName
const Layout = ({ activeView, onNavigate, children, isSidebarCollapsed, onToggleSidebar, onOpenInTab, onCaptureProfile, onLogout, userRole }) => {

  const navItems = [
    { id: 'dashboard_jobs', label: 'Vagas', icon: <BsBriefcaseFill /> },
    {
      id: 'candidate_list',
      label: 'Banco de Talentos',
      displayLabel: <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2', alignItems: 'flex-start', paddingTop: '2px', paddingBottom: '2px' }}><span>Banco</span><span>de Talentos</span></div>,
      icon: <IoPeopleSharp />
    },
    { id: 'settings', label: 'Configurações', icon: <IoSettingsSharp /> }
  ];

  if (userRole === 'admin') {
    navItems.push({ id: 'admin_dashboard', label: 'Admin', icon: <IoShieldCheckmarkSharp /> });
  }

  return (
    <div className={`${styles.layout} ${isSidebarCollapsed ? styles.collapsed : ''}`}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          {/* ANA ISSIDORO AVATAR AS LOGO - Top Position (BIG) */}
          <div
            className={`${styles.anaAvatarContainer} ${activeView === 'chat_ana' ? styles.anaActive : ''} ${styles.headerLogo}`}
            onClick={() => onNavigate('chat_ana')}
            title="Falar com Ana Issidoro"
          >
            <div className={styles.anaAvatarWrapper}>
              <img src="/logo.png" alt="Logo" className={styles.logoImage} />
            </div>
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
                <span className={styles.navLabel}>{item.displayLabel || item.label}</span>
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

          <div className={styles.versionInfo}>
            v1.2.2 da Ana Issidoro
          </div>
        </div>
      </aside>
      <main className={styles.content}>
        {children}
      </main>
    </div>
  );
};

export default Layout;