// CRIE O ARQUIVO: src/views/Admin/UserModal.jsx

import React, { useState, useEffect } from 'react';
import styles from './UserModal.module.css';

const UserModal = ({ user, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'user'
    });
    const [errors, setErrors] = useState({});

    const isEditing = user != null;

    useEffect(() => {
        if (isEditing) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                password: '', // Senha fica em branco por segurança na edição
                role: user.role || 'user'
            });
        }
    }, [user, isEditing]);

    const validate = () => {
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = 'O nome é obrigatório.';
        if (!formData.email.trim()) newErrors.email = 'O e-mail é obrigatório.';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Formato de e-mail inválido.';
        
        // A senha só é obrigatória na criação
        if (!isEditing && !formData.password) {
            newErrors.password = 'A senha é obrigatória para novos usuários.';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            onSave(formData, user?.id);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <header className={styles.header}>
                    <h3>{isEditing ? 'Editar Usuário' : 'Criar Novo Usuário'}</h3>
                    <button onClick={onClose} className={styles.closeButton}>×</button>
                </header>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="name">Nome Completo</label>
                        <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} />
                        {errors.name && <span className={styles.error}>{errors.name}</span>}
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="email">E-mail</label>
                        <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} />
                        {errors.email && <span className={styles.error}>{errors.email}</span>}
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="password">Senha</label>
                        <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} placeholder={isEditing ? 'Deixe em branco para não alterar' : ''} />
                        {errors.password && <span className={styles.error}>{errors.password}</span>}
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="role">Função (Role)</label>
                        <select id="role" name="role" value={formData.role} onChange={handleChange}>
                            <option value="user">Usuário</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>
                    <footer className={styles.footer}>
                        <button type="submit" className={styles.saveButton}>
                            {isEditing ? 'Salvar Alterações' : 'Criar Usuário'}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
};

export default UserModal;