// COLE ESTE CÓDIGO NO ARQUIVO: src/views/Admin/AdminDashboardView.jsx

import React, { useState, useEffect, useCallback } from 'react';
import styles from './AdminDashboardView.module.css';
import Header from '../../components/Header/Header';
import UserModal from './UserModal';
import Toast from './Toast';
import ConfirmModal from './ConfirmModal';
import * as api from '../../services/api.service'; // <-- Importa a API

const AdminDashboardView = ({ onLogout }) => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type }), 3500);
    };

    // Função para buscar usuários da API
    const fetchUsers = useCallback(async () => {
        try {
            setError(null);
            setIsLoading(true);
            const userList = await api.getAllUsers();
            setUsers(userList);
        } catch (err) {
            setError(err.message);
            showToast(err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Busca os usuários quando o componente é montado
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
            fetchUsers(); // Recarrega a lista de usuários
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
                fetchUsers(); // Recarrega a lista
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
            <Header title="Painel do Administrador" subtitle="Gerenciamento de usuários" />
            
            <div className={styles.toolbar}>
                <button onClick={openCreateModal} className={styles.addButton}>
                    + Criar Novo Usuário
                </button>
                <button onClick={handleLogout} className={styles.logoutButton}>
                    Sair
                </button>
            </div>

            <main className={styles.userList}>
                {isLoading && <div className={styles.loader}></div>}
                {error && <p className={styles.errorText}>{error}</p>}
                {!isLoading && !error && users.map(user => (
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
                    message={`Tem certeza que deseja excluir permanentemente o usuário "${userToDelete.name}"? Esta ação não pode ser desfeita.`}
                    onConfirm={confirmDeleteUser}
                    onCancel={cancelDeleteUser}
                    confirmText="Sim, Excluir"
                />
            )}
        </div>
    );
};

export default AdminDashboardView;