// ARQUIVO COMPLETO E CORRIGIDO: src/views/Manage/CandidateDetailView.jsx

import React, { useState, useEffect } from 'react';
import styles from './CandidateDetailView.module.css';
import * as api from '../../services/api.service';
import ScorecardView from '../Shared/Scorecard/ScorecardView';
import CreateScorecardView from '../Shared/Scorecard/CreateScorecardView';
import { MdEmail, MdPhone } from 'react-icons/md';
import { FaLinkedin } from 'react-icons/fa';
import { BsCheckCircleFill, BsXCircleFill } from 'react-icons/bs';

// --- Componentes internos (sem alterações) ---
const GeneralInfoTab = ({ candidate, onAccessScorecard, job }) => (<div className={styles.infoContainer}><div className={styles.contactSection}>{candidate.linkedinUsername && (<div className={styles.contactItem}><FaLinkedin className={styles.contactIcon} /><a href={`https://www.linkedin.com/in/${candidate.linkedinUsername}`} target="_blank" rel="noopener noreferrer">/{candidate.linkedinUsername}</a></div>)}{candidate.email && (<div className={styles.contactItem}><MdEmail className={styles.contactIcon} /><a href={`mailto:${candidate.email}`}>{candidate.email}</a></div>)}{candidate.phone && (<div className={styles.contactItem}><MdPhone className={styles.contactIcon} /><span>{candidate.phone}</span></div>)}</div><div className={styles.infoSection}><label className={styles.infoLabel}>Scorecards</label><div className={styles.buttonRow}><button className={styles.outlineButton} onClick={() => onAccessScorecard(job)}>Resumo de Avaliações</button></div></div></div>);
const CustomFieldDisplay = ({ field }) => { const value = field.value; const isValueEmpty = (v) => v === undefined || v === null || v === '' || (typeof v === 'object' && Object.keys(v).length === 0); if (isValueEmpty(value)) { return (<div className={styles.customFieldItem}><label className={styles.customFieldLabel}>{field.name}</label><div className={styles.customFieldValue}><span className={styles.emptyFieldValue}>—</span></div></div>); } let displayValue; let icon = null; switch (field.type) { case 'boolean': displayValue = value ? 'Sim' : 'Não'; icon = value ? <BsCheckCircleFill className={styles.booleanIconSuccess} /> : <BsXCircleFill className={styles.booleanIconFailure} />; break; case 'select': displayValue = value.label || value.title || 'Valor inválido'; break; default: displayValue = String(value); } return (<div className={styles.customFieldItem}><label className={styles.customFieldLabel}>{field.name}</label><div className={styles.customFieldValue}>{icon}<span>{displayValue}</span></div></div>); };
const CustomFieldsTab = ({ applicationCustomFields }) => (<div className={styles.infoContainer}>{applicationCustomFields && applicationCustomFields.length > 0 ? (<div className={styles.customFieldsGrid}>{applicationCustomFields.map(field => (<CustomFieldDisplay key={field.id || field.customFieldId || field.name} field={field} />))}</div>) : (<p className={styles.emptyState}>Nenhum campo personalizado para esta candidatura.</p>)}</div>);
// --- Fim dos componentes internos ---


const CandidateDetailView = ({
    candidate, job, onBack, onUpdateStage, stages, onGoToEdit,
    applicationCustomFields, interviewKits, initialState,
    scorecardSummary, scorecardHooks, onUpdateRequest,
    onSaveScorecardAsTemplate // <-- A PROP AGORA É RECEBIDA AQUI
}) => {
    const [activeTab, setActiveTab] = useState(() => initialState?.initialTab || 'general');
    const [isLoadingKit, setIsLoadingKit] = useState(false);
    const [evaluationToLoad, setEvaluationToLoad] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        const loadKitAndEvaluation = async () => {
            if (activeTab.startsWith('kit_')) {
                const kitId = activeTab.split('_')[1];
                setIsLoadingKit(true);
                setEvaluationToLoad(null);

                try {
                    const kitResult = await api.fetchInterviewKit(kitId);
                    if (!kitResult.success) { throw new Error(kitResult.error || 'Falha ao buscar estrutura do kit.'); }

                    scorecardHooks.handleSelectInterviewKit(kitResult.kit);

                    if (scorecardSummary && scorecardSummary.length > 0) {
                        const foundEvaluation = scorecardSummary.find(ev => ev.scorecardInterviewId === kitId);
                        if (foundEvaluation) { setEvaluationToLoad(foundEvaluation); }
                    }
                } catch (err) {
                    alert(`Erro ao carregar o kit: ${err.message}`);
                    setActiveTab('general');
                } finally {
                    setIsLoadingKit(false);
                }
            } else {
                scorecardHooks.handleSelectInterviewKit(null);
                setEvaluationToLoad(null);
            }
        };
        loadKitAndEvaluation();
    }, [activeTab, scorecardSummary, scorecardHooks.handleSelectInterviewKit]);

    const handleStageChange = (e) => onUpdateStage(candidate.application.id, e.target.value);

    const handleCancelEvaluation = () => {
        setActiveTab('general');
        scorecardHooks.handleSelectInterviewKit(null);
    };

    const selectedKitDetails = scorecardHooks.selectedInterviewKit;

    const handleUpdateClick = () => {
        setIsUpdating(true);
        // Passa o ID do kit selecionado (se houver) para o fluxo de update
        onUpdateRequest(selectedKitDetails?.id).catch((e) => {
            console.error("Falha no fluxo de atualização:", e);
        }).finally(() => {
            setIsUpdating(false);
        });
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button onClick={onBack} className={styles.backButton}>←</button>
                <div className={styles.candidateIdentifier}>
                    <div className={styles.avatar}>{candidate.name.substring(0, 2)}</div>
                    <div className={styles.nameContainer}>
                        <h3>{candidate.name}</h3>
                    </div>
                </div>
                <div className={styles.headerActions}>
                    <select className={styles.stageSelector} value={candidate.application.stageId} onChange={handleStageChange}>
                        {stages.map(stage => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
                    </select>

                </div>
            </header>

            <div className={styles.tabs}>
                <button className={`${styles.tabButton} ${activeTab === 'general' ? styles.active : ''}`} onClick={() => setActiveTab('general')}>Geral</button>
                <button className={`${styles.tabButton} ${activeTab === 'customFields' ? styles.active : ''}`} onClick={() => setActiveTab('customFields')}>Campos personalizados</button>
                {(interviewKits || []).length > 0 && <div className={styles.tabDivider}></div>}
                {(interviewKits || []).map(kit => (<button key={kit.id} className={`${styles.tabButton} ${activeTab === `kit_${kit.id}` ? styles.active : ''}`} onClick={() => setActiveTab(`kit_${kit.id}`)}> {kit.name} </button>))}
            </div>

            <main className={styles.mainContent}>
                <div className={styles.scrollableArea}>
                    {activeTab === 'general' && (<> <GeneralInfoTab candidate={candidate} onAccessScorecard={scorecardHooks.handleAccessScorecard} job={job} /> {(!interviewKits || interviewKits.length === 0) && (<div className={styles.noKitsContainer}> <p>Nenhum kit de entrevista encontrado para esta vaga.</p> <button onClick={() => setActiveTab('create_kit')} className={styles.createKitButton}> + Criar Primeiro Kit </button> </div>)} </>)}
                    {activeTab === 'customFields' && <CustomFieldsTab applicationCustomFields={applicationCustomFields} />}
                    {isLoadingKit && <div className={styles.loader}></div>}

                    {selectedKitDetails && (
                        <ScorecardView
                            candidate={candidate}
                            job={job}
                            scorecard={selectedKitDetails}
                            onCancel={handleCancelEvaluation}
                            initialEvaluationData={evaluationToLoad}
                            isAIEnabled={scorecardHooks.settings?.isAIEnabled || false}
                            onSubmit={scorecardHooks.handleScorecardSubmit}
                            onAIAssistScorecard={scorecardHooks.handleAIAssistScorecard}
                            onCheckCache={scorecardHooks.handleCheckAICache}
                            onSyncProfile={scorecardHooks.handleSyncProfile}
                            onSaveWeights={scorecardHooks.handleSaveWeights}
                            aiAnalysisCache={scorecardHooks.aiAnalysisCache}
                            onCacheAIResult={scorecardHooks.handleCacheAIResult}
                            onSaveAsTemplate={onSaveScorecardAsTemplate} // <-- E PASSADA PARA O SCORECARDVIEW AQUI
                        />
                    )}

                    {activeTab === 'create_kit' && (<CreateScorecardView job={job} application={candidate.application} onSubmit={scorecardHooks.handleCreateScorecardAndKit} onCancel={() => setActiveTab('general')} />)}
                </div>

                {(activeTab === 'general' || activeTab === 'customFields') && (<footer className={styles.footer}><button className={styles.editInfoButton} onClick={onGoToEdit}>Editar Informações</button></footer>)}
            </main>
        </div>
    );
};

export default CandidateDetailView;