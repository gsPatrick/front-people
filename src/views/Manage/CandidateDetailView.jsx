// src/views/Manage/CandidateDetailView.jsx

import React, { useState } from 'react';
import styles from './CandidateDetailView.module.css';
import { IoTrashOutline } from 'react-icons/io5';
import { GoThumbsup, GoThumbsdown } from 'react-icons/go';
import { MdEmail, MdPhone } from 'react-icons/md';
import { FaLinkedin, FaBuilding, FaMapMarkerAlt } from 'react-icons/fa';
import { BsCheckCircleFill, BsXCircleFill } from 'react-icons/bs';
import { GiReceiveMoney } from 'react-icons/gi';
import { FaLaptopHouse } from 'react-icons/fa';

// Componente para renderizar campos personalizados (visualização)
const CustomFieldDisplay = ({ field }) => {
    const value = field.value;

    let displayValue;
    let icon = null;

    const isValueEmpty = (v) => v === undefined || v === null || v === '' || (typeof v === 'object' && Object.keys(v).length === 0);

    if (isValueEmpty(value)) {
        displayValue = <span className={styles.emptyFieldValue}>—</span>;
    } else {
        switch (field.type) {
            case 'text':
            case 'textarea':
            case 'number':
            case 'date':
            case 'shortText':
            case 'longText':
                displayValue = value;
                break;
            case 'select':
                displayValue = value.label || value.title || 'Valor inválido';
                break;
            case 'boolean':
                displayValue = value ? 'Sim' : 'Não';
                icon = value ? <BsCheckCircleFill className={styles.booleanIconSuccess} /> : <BsXCircleFill className={styles.booleanIconFailure} />;
                break;
            case 'fileUpload':
                displayValue = "Arquivo Anexado";
                break;
            default:
                displayValue = String(value);
        }
    }

    return (
        <div className={styles.customFieldItem}>
            <label className={styles.customFieldLabel}>{field.name}</label>
            <div className={styles.customFieldValue}>
                {icon}
                <span>{displayValue}</span>
            </div>
        </div>
    );
};


const CandidateDetailView = ({ 
    candidate, 
    job, 
    onBack, 
    onUpdateStage, 
    stages, 
    onGoToEdit, 
    onAccessScorecard, 
    onStartNewEvaluation,
    applicationCustomFields  
}) => {
    const [activeTab, setActiveTab] = useState('general'); 
    
    const handleStageChange = (e) => {
        onUpdateStage(candidate.application.id, e.target.value);
    };

    const getEmail = () => candidate.email || null;
    const getPhone = () => candidate.phone || null;
    const getLinkedInUsername = () => candidate.linkedinUsername || null;
    const getLocation = () => candidate.location || null;
    const getCompany = () => candidate.company || null;
    const getSource = () => candidate.application?.source || null;

    const getTargetSalary = () => {
        const salary = candidate.application?.targetSalary;
        if (salary?.value) {
            const formattedValue = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: salary.currency || 'BRL' }).format(salary.value);
            return `${formattedValue} ${salary.type || ''}`;
        }
        return null;
    };

    const getWorkModel = () => {
        const workModel = candidate.application?.workModel;
        if (workModel?.model) {
            let model = workModel.model;
            if (workModel.agreed) { model += ' (Aceita)'; }
            if (workModel.locationCountry) { model += ` - ${workModel.locationCountry}`; }
            return model;
        }
        return null;
    };
    
    const GeneralInfoTab = () => (
        <div className={styles.infoContainer}>
            <div className={styles.contactSection}>
                {getEmail() && ( <div className={styles.contactItem}><MdEmail className={styles.contactIcon} /><span className={styles.contactValue}>{getEmail()}</span><a href={`mailto:${getEmail()}`} target="_blank" rel="noopener noreferrer" className={styles.contactActionIcon}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg></a></div> )}
                {getPhone() && ( <div className={styles.contactItem}><MdPhone className={styles.contactIcon} /><span className={styles.contactValue}>{getPhone()}</span><a href={`tel:${getPhone()}`} className={styles.contactActionIcon}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2H7c.57 0 1.13.2 1.57.54l2.18 2.18a2 2 0 0 1 .6 2.22l-1.6 4.35a1 1 0 0 0 .35 1.09l.61.61a1 1 0 0 0 1.09.35l4.35-1.6a2 2 0 0 1 2.22.6l2.18 2.18c.34.44.54 1 .54 1.57z"></path></svg></a></div> )}
                {getLinkedInUsername() && ( <div className={styles.contactItem}><FaLinkedin className={styles.contactIcon} /><span className={styles.contactValue}>/{getLinkedInUsername()}</span><a href={`https://www.linkedin.com/in/${getLinkedInUsername()}`} target="_blank" rel="noopener noreferrer" className={styles.contactActionIcon}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a></div> )}
            </div>
            
            {getCompany() && ( <div className={styles.infoSection}><label className={styles.infoLabel}>Empresa Atual</label><div className={styles.infoValueWithIcon}><FaBuilding className={styles.infoIcon} /><span>{getCompany()}</span></div></div> )}
            {getLocation() && ( <div className={styles.infoSection}><label className={styles.infoLabel}>Localização</label><div className={styles.infoValueWithIcon}><FaMapMarkerAlt className={styles.infoIcon} /><span>{getLocation()}</span></div></div> )}
            {getTargetSalary() && ( <div className={styles.infoSection}><label className={styles.infoLabel}>Pretensão Salarial na Vaga</label><div className={styles.infoValueWithIcon}><GiReceiveMoney className={styles.infoIcon} /><span>{getTargetSalary()}</span></div></div> )}
            {getWorkModel() && ( <div className={styles.infoSection}><label className={styles.infoLabel}>Modelo de Trabalho</label><div className={styles.infoValueWithIcon}><FaLaptopHouse className={styles.infoIcon} /><span>{getWorkModel()}</span></div></div> )}
            {getSource() && ( <div className={styles.infoSection}><label className={styles.infoLabel}>Fonte</label><div className={styles.infoValueWithText}><span>{getSource()}</span></div></div> )}

            <div className={styles.infoSection}>
                <label className={styles.infoLabel}>Scorecards</label>
                <div className={styles.buttonRow}>
                    <button className={styles.outlineButton} onClick={() => onAccessScorecard(candidate.application, job)}>Resumo de Avaliações</button>
                    <button className={styles.outlineButton} onClick={() => onStartNewEvaluation(candidate.application, job)}>Acessar kit de entrevista</button>
                </div>
            </div>
        </div>
    );

    const CustomFieldsTab = () => (
        <div className={styles.infoContainer}>
            {applicationCustomFields && applicationCustomFields.length > 0 ? (
                <div className={styles.customFieldsGrid}>
                    {applicationCustomFields.map(field => ( <CustomFieldDisplay key={field.id || field.customFieldId || field.name} field={field} /> ))}
                </div>
            ) : (
                <p className={styles.emptyState}>Nenhum campo personalizado configurado para esta candidatura.</p>
            )}
        </div>
    );

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button onClick={onBack} className={styles.backButton}>←</button>
                 <div className={styles.candidateIdentifier}>
                    <div className={styles.avatar}>{candidate.name.substring(0, 2)}</div>
                    <div className={styles.nameContainer}>
                        <h3>{candidate.name}</h3>
                        <p className={styles.candidateHeadline}>{candidate.headline || 'Sem título'}</p>
                    </div>
                </div>
                <div className={styles.headerActions}>
                     <select className={styles.stageSelector} value={candidate.application.stageId} onChange={handleStageChange}>
                        {stages.map(stage => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
                    </select>
                </div>
            </header>
            
            <main className={styles.mainContent}>
                <div className={styles.tabs}>
                    <button className={`${styles.tabButton} ${activeTab === 'general' ? styles.active : ''}`} onClick={() => setActiveTab('general')}>Geral</button>
                    <button className={`${styles.tabButton} ${activeTab === 'customFields' ? styles.active : ''}`} onClick={() => setActiveTab('customFields')}>Campos personalizados</button>
                </div>
                <div className={styles.scrollableArea}>
                    {activeTab === 'general' && <GeneralInfoTab />}
                    {activeTab === 'customFields' && <CustomFieldsTab />}
                </div>
            </main>

            <footer className={styles.footer}>
                <button className={styles.editInfoButton} onClick={onGoToEdit}>Editar Informações</button>
            </footer>
        </div>
    );
};

export default CandidateDetailView;