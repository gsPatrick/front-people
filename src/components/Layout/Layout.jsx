// src/components/Layout/Layout.jsx

import React from 'react';
import styles from './Layout.module.css';
import { BsBriefcaseFill, BsLayoutSidebarInsetReverse, BsLayoutSidebarInset, BsBoxArrowUpRight, BsLinkedin } from 'react-icons/bs';
import { IoPeopleSharp, IoSettingsSharp } from 'react-icons/io5';

// ### CORREÇÃO: Adicionamos onCaptureProfile como uma nova prop
const Layout = ({ activeView, onNavigate, children, isSidebarCollapsed, onToggleSidebar, onOpenInTab, onCaptureProfile }) => {

  const navItems = [
    { id: 'dashboard_jobs', label: 'Vagas', icon: <BsBriefcaseFill /> },
    { id: 'dashboard_talents', label: 'Talentos', icon: <IoPeopleSharp /> },
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
          {/* ### NOVO BOTÃO DE CAPTURA (aparece condicionalmente) ### */}
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
              <span className={styles.navLabel}>{item.label}</span>
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
        </div>
      </aside>
      <main className={styles.content}>
        {children}
      </main>
    </div>
  );
};

export default Layout;