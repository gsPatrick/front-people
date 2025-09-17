// src/views/Manage/EditCandidateView.jsx

import React, { useState, useEffect } from 'react';
import styles from './EditCandidateView.module.css'; 
import Header from '../../components/Header/Header';
import CustomFieldsForm from '../../components/Modals/CustomFieldsForm'; 

const validateEmail = (email) => {
    if (!email) return true;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
};

// ==========================================================
// CORREÇÃO 1: Componentes das abas movidos para fora
// Eles agora são componentes estáveis e recebem dados via props.
// ==========================================================

const GeneralInfoTab = ({ formData, handleChange }) => (
    <>
        <h4 className={styles.sectionTitle}>Informações Principais</h4>
        <div className={styles.inputGroup}>
            <label>Nome Completo *</label>
            <input type="text" name="name" value={formData.name || ''} onChange={handleChange} required />
        </div>
        <div className={styles.inputGroup}>
            <label>Título / Headline</label>
            <input type="text" name="headline" value={formData.headline || ''} onChange={handleChange} />
        </div>
        <div className={styles.inputGroup}>
            <label>Empresa Atual</label>
            <input type="text" name="company" value={formData.company || ''} onChange={handleChange} />
        </div>
        <div className={styles.inputGroup}>
            <label>Localização</label>
            <input type="text" name="location" value={formData.location || ''} onChange={handleChange} placeholder="Cidade, Estado, País" />
        </div>

        <h4 className={styles.sectionTitle}>Contato</h4>
        <div className={styles.inputGroup}>
            <label>E-mail</label>
            <input type="email" name="email" value={formData.email || ''} onChange={handleChange} placeholder="Digite o e-mail" />
        </div>
        <div className={styles.inputGroup}>
            <label>Telefone</label>
            <input type="tel" name="phone" value={formData.phone || ''} onChange={handleChange} placeholder="+55 (00) 00000-0000" />
        </div>
    </>
);

const CustomFieldsTab = ({ applicationCustomFields, customFormData, handleCustomFieldChange }) => (
    <CustomFieldsForm 
        fields={applicationCustomFields}
        formData={customFormData}
        handleChange={handleCustomFieldChange} 
    />
);


// ==========================================================
// COMPONENTE PRINCIPAL
// ==========================================================

const EditCandidateView = ({ 
    candidate, 
    onSave, 
    onCancel,
    applicationCustomFields
}) => {
    const [activeTab, setActiveTab] = useState('general'); 
    const [formData, setFormData] = useState({});
    const [customFormData, setCustomFormData] = useState({});

    useEffect(() => {
        setFormData({
            name: candidate.name || '',
            headline: candidate.headline || '',
            email: candidate.email || '', 
            phone: candidate.phone || '', 
            location: candidate.location || '',
            company: candidate.company || ''
        });

        const initialCustomFields = {};
        applicationCustomFields.forEach(field => {
            const fieldId = field.id || field.customFieldId;
            initialCustomFields[fieldId] = field.value;
        });
        setCustomFormData(initialCustomFields);

    }, [candidate, applicationCustomFields]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleCustomFieldChange = (e) => {
        const { name, value, type, checked } = e.target;
        let finalValue = value;

        if (type === 'checkbox') {
            finalValue = checked;
        } else if (type === 'select-one') {
            const originalField = applicationCustomFields.find(f => f.id === name);
            if (originalField?.answerOptions) {
                const selectedOption = originalField.answerOptions.find(opt => opt.id === value);
                if (selectedOption) {
                    finalValue = {
                        id: selectedOption.id,
                        label: selectedOption.label || selectedOption.title,
                        value: selectedOption.value || selectedOption.title
                    };
                } else {
                    finalValue = null; 
                }
            }
        }
        
        setCustomFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleSave = () => {
        if (formData.email && !validateEmail(formData.email)) {
            alert('Por favor, insira um endereço de e-mail válido.');
            return;
        }

        const talentPayload = { ...formData }; 

        const customFieldsPayload = applicationCustomFields.map(originalField => {
            const fieldId = originalField.id || originalField.customFieldId;
            const updatedValue = customFormData[fieldId];
            
            return {
                id: originalField.id,
                name: originalField.name,
                type: originalField.type,
                value: (updatedValue !== undefined) ? updatedValue : originalField.value
            };
        }).filter(field => field.value !== null && field.value !== undefined);

        onSave(candidate.id, talentPayload, customFieldsPayload);
    };

    return (
        <div className={styles.container}>
            <Header
                title="Editar Informações"
                subtitle={`Modificando detalhes de ${candidate.name}`}
                onBack={onCancel}
            />
            <div className={styles.tabs}>
                <button 
                    className={`${styles.tabButton} ${activeTab === 'general' ? styles.active : ''}`}
                    onClick={() => setActiveTab('general')}
                >
                    Geral
                </button>
                <button 
                    className={`${styles.tabButton} ${activeTab === 'customFields' ? styles.active : ''}`}
                    onClick={() => setActiveTab('customFields')}
                >
                    Campos personalizados
                </button>
            </div>
            <main className={styles.scrollableArea}>
                {/* CORREÇÃO 2: Renderiza os componentes externos passando as props necessárias */}
                {activeTab === 'general' && <GeneralInfoTab formData={formData} handleChange={handleChange} />}
                {activeTab === 'customFields' && <CustomFieldsTab 
                                                    applicationCustomFields={applicationCustomFields} 
                                                    customFormData={customFormData} 
                                                    handleCustomFieldChange={handleCustomFieldChange} 
                                                  />}
            </main>
            <footer className={styles.footer}>
                <button onClick={onCancel} className={styles.cancelButton}>Cancelar</button>
                <button onClick={handleSave} className={styles.saveButton}>Salvar Alterações</button>
            </footer>
        </div>
    );
};

export default EditCandidateView;