import React, { useState, useEffect, useCallback } from 'react';
import styles from './AdminDashboardView.module.css';
import Header from '../../components/Header/Header';
import UserModal from './UserModal';
import Toast from './Toast';
import ConfirmModal from './ConfirmModal';
import * as api from '../../services/api.service';
import AIMemoryView from '../Settings/AIMemoryView'; // Reutilizando a view

const AdminDashboardView = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState('users'); // 'users', 'config', 'logs', 'ai_memory'

    // User State
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    const tabs = [
        { id: 'users', label: 'Usuários' },
        { id: 'ai_memory', label: 'Memória da IA' },
        { id: 'logs', label: 'Logs' }
    ];

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type }), 3500);
    };

    const fetchUsers = useCallback(async () => {
        if (activeTab !== 'users') return;
        try {
            setError(null);
            setIsLoading(true);
            const userList = await api.getAllUsers();
            setUsers(userList || []);
        } catch (err) {
            setError(err.message);
            showToast(err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleLogout = () => {
        setIsLoggingOut(true);
        setTimeout(() => { onLogout(); }, 500);
    };

    const handleSaveUser = async (formData, userId) => {
        try {
            if (userId) {
                await api.updateUser(userId, formData);
                showToast('Usuário atualizado com sucesso!');
            } else {
                await api.createUser(formData);
                showToast('Usuário criado com sucesso!');
            }
            setIsModalOpen(false);
            fetchUsers();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    const requestDeleteUser = (user) => {
        setUserToDelete(user);
        setIsConfirmModalOpen(true);
    };

    const confirmDeleteUser = async () => {
        if (userToDelete) {
            try {
                await api.deleteUser(userToDelete.id);
                showToast(`Usuário '${userToDelete.name}' excluído.`, 'success');
                fetchUsers();
            } catch (err) {
                showToast(err.message, 'error');
            }
        }
        setIsConfirmModalOpen(false);
        setUserToDelete(null);
    };

    const cancelDeleteUser = () => {
        setIsConfirmModalOpen(false);
        setUserToDelete(null);
    };

    const openCreateModal = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const containerClass = `${styles.container} ${isLoggingOut ? styles.loggingOut : ''}`;

    return (
        <div className={containerClass}>
            <Header title="Painel do Administrador" subtitle="Gerenciamento do sistema" />

            <div className={styles.tabsContainer}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`${styles.tabButton} ${activeTab === tab.id ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <main className={styles.contentArea}>
                {activeTab === 'users' && (
                    <>
                        <div className={styles.toolbar}>
                            <button onClick={openCreateModal} className={styles.addButton}>
                                + Criar Novo Usuário
                            </button>
                            <button onClick={handleLogout} className={styles.logoutButton}>
                                Sair
                            </button>
                        </div>

                        <div className={styles.userList}>
                            {isLoading && <div className={styles.loader}></div>}
                            {error && <p className={styles.errorText}>{error}</p>}

                            {!isLoading && !error && (!users || users.length === 0) && (
                                <div className={styles.emptyState}>Nenhum usuário encontrado.</div>
                            )}

                            {!isLoading && !error && Array.isArray(users) && users.map(user => (
                                <div key={user.id} className={styles.userCard}>
                                    <div className={styles.userInfo}>
                                        <span className={styles.userName}>{user.name}</span>
                                        <span className={styles.userEmail}>{user.email}</span>
                                    </div>
                                    <div className={styles.userRole}>
                                        <span className={user.role === 'admin' ? styles.adminBadge : styles.userBadge}>
                                            {user.role}
                                        </span>
                                    </div>
                                    <div className={styles.userActions}>
                                        <button onClick={() => openEditModal(user)} className={styles.actionButton}>Editar</button>
                                        <button onClick={() => requestDeleteUser(user)} className={`${styles.actionButton} ${styles.deleteButton}`}>Excluir</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {activeTab === 'ai_memory' && (
                    <div className={styles.embeddedView}>
                        <AIMemoryView isEmbedded={true} />
                    </div>
                )}

                {activeTab === 'logs' && (
                    <div className={styles.placeholderTab}>
                        <h3>Logs do Sistema</h3>
                        <p>Funcionalidade em desenvolvimento.</p>
                    </div>
                )}
            </main>

            {isModalOpen && (
                <UserModal
                    user={editingUser}
                    onSave={handleSaveUser}
                    onClose={() => setIsModalOpen(false)}
                />
            )}

            {toast.show && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onDismiss={() => setToast({ ...toast, show: false })}
                />
            )}

            {isConfirmModalOpen && userToDelete && (
                <ConfirmModal
                    title="Confirmar Exclusão"
                    message={`Tem certeza que deseja excluir "${userToDelete.name}"?`}
                    onConfirm={confirmDeleteUser}
                    onCancel={cancelDeleteUser}
                    confirmText="Excluir"
                />
            )}
        </div>
    );
};

export default AdminDashboardView;