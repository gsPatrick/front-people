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

// Categorias para heurística de mapeamento de campos personalizados
const FIELD_CATEGORIES = {
    personal: ['cpf', 'rg', 'nascimento', 'data de nascimento', 'gênero', 'sexo', 'estado civil', 'nacionalidade'],
    professional: ['experiência', 'cargo', 'pretensão', 'nível', 'salário', 'aviso', 'formação', 'escolaridade', 'idioma'],
    contact: ['whatsapp', 'skype', 'telegram', 'telefone', 'celular', 'email', 'e-mail', 'contato'],
};

const getCategoryForField = (fieldName) => {
    const name = fieldName.toLowerCase();
    if (FIELD_CATEGORIES.personal.some(k => name.includes(k))) return 'personal';
    if (FIELD_CATEGORIES.professional.some(k => name.includes(k))) return 'professional';
    if (FIELD_CATEGORIES.contact.some(k => name.includes(k))) return 'contact';
    return 'additional';
};

const CategoryFields = ({ category, applicationCustomFields, customFormData, handleCustomFieldChange, standardFields = null }) => {
    const filteredCustomFields = applicationCustomFields.filter(f => getCategoryForField(f.name) === category);
    
    return (
        <>
            {standardFields}
            {filteredCustomFields.length > 0 && (
                <CustomFieldsForm 
                    fields={filteredCustomFields}
                    formData={customFormData}
                    handleChange={handleCustomFieldChange} 
                />
            )}
        </>
    );
};

// ==========================================================
// COMPONENTE PRINCIPAL
// ==========================================================

const EditCandidateView = ({ 
    candidate, 
    onSave, 
    onCancel,
    applicationCustomFields
}) => {
    const [activeTab, setActiveTab] = useState('personal'); 
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
            const options = originalField?.answerOptions || originalField?.options;
            if (options) {
                const selectedOption = options.find(opt => opt.id === value || opt.value === value || opt === value);
                if (selectedOption) {
                    finalValue = typeof selectedOption === 'object' ? {
                        id: selectedOption.id || selectedOption.value,
                        label: selectedOption.label || selectedOption.title || selectedOption.name || selectedOption.value,
                        value: selectedOption.value || selectedOption.title || selectedOption.id
                    } : selectedOption;
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
                <button className={`${styles.tabButton} ${activeTab === 'personal' ? styles.active : ''}`} onClick={() => setActiveTab('personal')}>Personal</button>
                <button className={`${styles.tabButton} ${activeTab === 'professional' ? styles.active : ''}`} onClick={() => setActiveTab('professional')}>Profissional</button>
                <button className={`${styles.tabButton} ${activeTab === 'contact' ? styles.active : ''}`} onClick={() => setActiveTab('contact')}>Contato</button>
                <button className={`${styles.tabButton} ${activeTab === 'additional' ? styles.active : ''}`} onClick={() => setActiveTab('additional')}>Adicional</button>
            </div>
            
            <main className={styles.scrollableArea}>
                {activeTab === 'personal' && (
                    <CategoryFields 
                        category="personal"
                        applicationCustomFields={applicationCustomFields}
                        customFormData={customFormData}
                        handleCustomFieldChange={handleCustomFieldChange}
                        standardFields={
                            <>
                                <h4 className={styles.sectionTitle}>Dados Pessoais</h4>
                                <div className={styles.inputGroup}>
                                    <label>Nome Completo *</label>
                                    <input type="text" name="name" value={formData.name || ''} onChange={handleChange} required />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>Título / Headline</label>
                                    <input type="text" name="headline" value={formData.headline || ''} onChange={handleChange} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>Localização</label>
                                    <input type="text" name="location" value={formData.location || ''} onChange={handleChange} placeholder="Cidade, Estado, País" />
                                </div>
                            </>
                        }
                    />
                )}

                {activeTab === 'professional' && (
                    <CategoryFields 
                        category="professional"
                        applicationCustomFields={applicationCustomFields}
                        customFormData={customFormData}
                        handleCustomFieldChange={handleCustomFieldChange}
                        standardFields={
                            <>
                                <h4 className={styles.sectionTitle}>Dados Profissionais</h4>
                                <div className={styles.inputGroup}>
                                    <label>Empresa Atual</label>
                                    <input type="text" name="company" value={formData.company || ''} onChange={handleChange} />
                                </div>
                            </>
                        }
                    />
                )}

                {activeTab === 'contact' && (
                    <CategoryFields 
                        category="contact"
                        applicationCustomFields={applicationCustomFields}
                        customFormData={customFormData}
                        handleCustomFieldChange={handleCustomFieldChange}
                        standardFields={
                            <>
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
                        }
                    />
                )}

                {activeTab === 'additional' && (
                    <CategoryFields 
                        category="additional"
                        applicationCustomFields={applicationCustomFields}
                        customFormData={customFormData}
                        handleCustomFieldChange={handleCustomFieldChange}
                    />
                )}
            </main>
            <footer className={styles.footer}>
                <button onClick={onCancel} className={styles.cancelButton}>Cancelar</button>
                <button onClick={handleSave} className={styles.saveButton}>Salvar Alterações</button>
            </footer>
        </div>
    );
};

export default EditCandidateView;