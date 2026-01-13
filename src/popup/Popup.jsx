// ARQUIVO COMPLETO E CORRIGIDO: src/popup/Popup.jsx

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import styles from './Popup.module.css';
import { loadAuthData, saveAuthData, clearAuthData } from '../services/session.service';
import * as api from '../services/api.service';
import { extractTextFromPdf } from '../services/pdf.service';

// Hooks
import { useApp } from '../hooks/useApp';
import { useNavigation } from '../hooks/useNavigation';
import { useJobs } from '../hooks/useJobs';
import { useTalents } from '../hooks/useTalents';
import { useWorkflow } from '../hooks/useWorkflow';
import { useScorecard } from '../hooks/useScorecard';
import { useBatchQueue } from '../hooks/useBatchQueue';

// Views e Componentes
import LoginView from '../views/Auth/LoginView';
import WelcomeView from '../views/Auth/WelcomeView';
import AdminDashboardView from '../views/Admin/AdminDashboardView';
import Layout from '../components/Layout/Layout';
import DragDropOverlay from '../components/Layout/DragDropOverlay';
import JobsDashboardView from '../views/Manage/JobsDashboardView';
import TalentsDashboardView from '../views/Manage/TalentsDashboardView';
import JobDetailsView from '../views/Manage/JobDetailsView';
import CandidateDetailView from '../views/Manage/CandidateDetailView';
import EditCandidateView from '../views/Manage/EditCandidateView';
import TalentProfileView from '../views/Manage/TalentProfileView';
import SettingsView from '../views/Settings/SettingsView';
import AIMemoryView from '../views/Settings/AIMemoryView';
import RestartView from '../views/Shared/RestartView';
import ScrapingView from '../views/Shared/ScrapingView';
import ConfirmProfileView from '../views/AddCandidate/ConfirmProfileView';
import UploadPdfView from '../views/AddCandidate/UploadPdfView';
import UpdatePdfView from '../views/AddCandidate/UpdatePdfView';
import ScorecardHubView from '../views/Scorecards/ScorecardHubView';
import ScorecardEditView from '../views/Scorecards/ScorecardEditView';
import MatchView from '../views/Match/MatchView';
import MatchResultView from '../views/Match/MatchResultView';
import BatchQueueView from '../views/Match/BatchQueueView';
import ExitMatchModeModal from '../components/Modals/ExitMatchModeModal';
import ExtractedTextView from '../views/Shared/ExtractedTextView';
import ProfileStatusNotification from '../components/Layout/ProfileStatusNotification';

const LoadingView = () => (<div className={styles.centeredContainer}><div className={styles.loadingSpinner}></div></div>);
const ErrorView = ({ error, onRetry }) => (<div className={`${styles.centeredContainer} ${styles.errorContainer}`}><p className={styles.errorTitle}>Ocorreu um Erro</p><p className={styles.errorMessage}>{String(error)}</p><button onClick={onRetry} className={styles.retryButton}>Tentar Novamente</button></div>);

const Popup = () => {
    const [authState, setAuthState] = useState({ isLoading: true, isAuthenticated: false, user: null, token: null, error: null });
    const [showWelcome, setShowWelcome] = useState(false);
    const [isGlobalLoading, setIsGlobalLoading] = useState(true);
    const [globalError, setGlobalError] = useState(null);
    const [isPagingLoading, setIsPagingLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [jobStatusFilter, setJobStatusFilter] = useState('open');
    const [isDraggingFile, setIsDraggingFile] = useState(false);
    const [scorecardTemplates, setScorecardTemplates] = useState([]);
    const [scorecardFilters, setScorecardFilters] = useState({ term: '', ats: 'all' });
    const [activeMatchScorecardId, setActiveMatchScorecardId] = useState(null);
    const [matchResult, setMatchResult] = useState(null);
    const [isScrapingForMatch, setIsScrapingForMatch] = useState(false);
    const [currentScrapedProfile, setCurrentScrapedProfile] = useState(null);
    const [isMatchProfileLocked, setIsMatchProfileLocked] = useState(false);
    const [isExitModalVisible, setIsExitModalVisible] = useState(false);
    const [navigationTarget, setNavigationTarget] = useState(null);
    const isLoadingRef = useRef(false);

    const executeAsync = useCallback(async (asyncFunction, isPaging = false) => {
        if (isLoadingRef.current) return;
        isLoadingRef.current = true;
        setGlobalError(null);
        isPaging ? setIsPagingLoading(true) : setIsGlobalLoading(true);
        try { await asyncFunction(); } catch (err) {
            if (err.status === 401 || err.status === 403) { await clearAuthData(); window.location.reload(); }
            else { setGlobalError(err.message || 'Ocorreu um erro inesperado.'); }
        } finally {
            isLoadingRef.current = false; setIsGlobalLoading(false); setIsPagingLoading(false);
        }
    }, []);

    const { view, navigateTo, goBack } = useNavigation();

    const { settings, setSettings, handleSettingChange, handleCaptureLinkedInProfile, validationResult } = useApp(executeAsync, navigateTo);
    const workflow = useWorkflow(executeAsync, navigateTo, goBack, handleCaptureLinkedInProfile);

    useEffect(() => {
        if (validationResult) {
            if (validationResult.exists) {
                workflow.setProfileContext({
                    exists: true,
                    talent: validationResult.talent,
                    profileData: { name: validationResult.talent.name }
                });
            } else {
                workflow.setProfileContext({
                    exists: false,
                    profileData: { username: validationResult.username }
                });
            }
        }
    }, [validationResult, workflow.setProfileContext]);

    const { jobsData, fetchAndSetJobs, handleJobsPageChange } = useJobs(executeAsync);
    const { talentsData, filters, setFilters, handleTalentsPageChange } = useTalents(executeAsync, view);
    const scorecard = useScorecard({
        executeAsync,
        settings,
        currentTalent: workflow.currentTalent,
        currentJob: workflow.currentJob,
        currentApplication: workflow.currentApplication,
        onScorecardUpdate: workflow.refreshScorecardSummary // Passa a função de refresh
    });
    const batchQueue = useBatchQueue();

    const fetchAllScorecards = useCallback(async () => {
        const allScorecards = await api.getAllScorecards();
        setScorecardTemplates(allScorecards || []);
    }, []);

    useEffect(() => {
        if (!chrome.runtime) return;
        const messageListener = (message, sender, sendResponse) => {
            if (message.type === 'PDF_EXTRACTION_SUCCESS') {
                // Se batch queue está ativo, NÃO navegar para confirm_profile
                if (batchQueue.queueState.isRunning) {
                    console.log('[POPUP] PDF extraído durante batch mode - ignorando navegação');
                    return;
                }

                // CHECK: Se for atualização de perfil
                if (workflow.updateContext?.isUpdating) {
                    console.log('[POPUP] Modo de atualização detectado. Iniciando atualização...');
                    workflow.handleProfileUpdateFromExtraction(message.payload);
                    return;
                }

                // Modo normal: O background processou o PDF e nos enviou o resultado JSON.
                workflow.setProfileContext({ exists: false, profileData: message.payload });
                navigateTo('confirm_profile');
            } else if (message.type === 'PDF_EXTRACTION_FAILURE') {
                if (batchQueue.queueState.isRunning) {
                    console.log('[POPUP] Falha na extração durante batch mode - ignorando');
                    return;
                }
                alert(`Falha no processamento: ${message.payload.message}`);
                // Se estava tentando atualizar e falhou, volta para details
                if (workflow.updateContext?.isUpdating) {
                    goBack();
                    return;
                }
                navigateTo('dashboard_jobs');
            }
        };
        chrome.runtime.onMessage.addListener(messageListener);
        return () => {
            if (chrome.runtime.onMessage) chrome.runtime.onMessage.removeListener(messageListener);
        };
    }, [navigateTo, workflow, batchQueue.queueState.isRunning]);

    const handlePdfMatch = useCallback((pdfFile) => {
        if (!activeMatchScorecardId) return;
        executeAsync(async () => {
            setIsScrapingForMatch(true); setMatchResult(null);
            try {
                const extractedText = await extractTextFromPdf(pdfFile);
                if (!extractedText) throw new Error("Não foi possível extrair texto do PDF para o match.");
                const jsonData = await api.processProfileFromText(extractedText);
                if (!jsonData) throw new Error("A API de IA não retornou dados válidos para o match.");
                const result = await api.analyzeProfileWithAI(activeMatchScorecardId, jsonData);
                setMatchResult(result); setCurrentScrapedProfile(jsonData);
            } finally { setIsScrapingForMatch(false); }
        });
    }, [executeAsync, activeMatchScorecardId]);

    const handleToggleLock = () => setIsMatchProfileLocked(p => !p);
    const handleSelectMatchScorecard = useCallback((id) => {
        setActiveMatchScorecardId(id); setMatchResult(null); setCurrentScrapedProfile(null); setIsMatchProfileLocked(false);
    }, []);

    // Handler para iniciar modo de fila em lote
    const handleStartBatchMode = useCallback(async (scorecardId) => {
        await batchQueue.detectLinkedInTabs();
        navigateTo('batch_queue', { scorecardId });
    }, [batchQueue, navigateTo]);

    useEffect(() => { if (activeMatchScorecardId && view.name !== 'match_hub') navigateTo('match_hub'); }, [activeMatchScorecardId, navigateTo, view.name]);

    useEffect(() => {
        const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.types?.includes('Files')) setIsDraggingFile(true); };
        const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); if (!e.currentTarget.contains(e.relatedTarget)) setIsDraggingFile(false); };
        const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };

        // ==========================================================
        // A CORREÇÃO ESTÁ AQUI
        // ==========================================================
        const handleDrop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingFile(false);
            if (isMatchProfileLocked) return;

            const file = e.dataTransfer.files[0];
            if (file?.type !== 'application/pdf') {
                alert("Por favor, solte apenas arquivos PDF.");
                return;
            }

            // Lógica condicional:
            if (activeMatchScorecardId) {
                // Se o modo Match estiver ativo, chama a função de match.
                handlePdfMatch(file);
            } else if (view.name === 'update_pdf') {
                // Se estivermos na tela de atualização, chama a função de ATUALIZAÇÃO.
                workflow.handlePdfUpdate(file);
            } else {
                // Caso contrário, usa a função padrão de CRIAÇÃO.
                workflow.handlePdfUpload(file);
            }
        };

        document.body.addEventListener('dragenter', handleDragEnter);
        document.body.addEventListener('dragleave', handleDragLeave);
        document.body.addEventListener('dragover', handleDragOver);
        document.body.addEventListener('drop', handleDrop);
        return () => {
            document.body.removeEventListener('dragenter', handleDragEnter);
            document.body.removeEventListener('dragleave', handleDragLeave);
            document.body.removeEventListener('dragover', handleDragOver);
            document.body.removeEventListener('drop', handleDrop);
        };
    }, [workflow, handlePdfMatch, activeMatchScorecardId, isMatchProfileLocked, view.name]); // Adicionado view.name às dependências

    useEffect(() => {
        const checkAuthAndInit = async () => {
            try {
                const authData = await loadAuthData();
                if (authData?.token && authData?.user) {
                    setAuthState({ isLoading: false, isAuthenticated: true, user: authData.user, token: authData.token, error: null });
                    setSettings({ isPersistenceEnabled: false, isOpenInTabEnabled: true, isAIEnabled: true });
                    await Promise.all([
                        fetchAndSetJobs(1, 'open'),
                        fetchAllScorecards()
                    ]);
                    navigateTo('dashboard_jobs');
                } else { setAuthState({ isLoading: false, isAuthenticated: false, user: null, token: null, error: null }); }
            } catch (err) {
                setGlobalError(`Erro ao iniciar: ${err.message}.`);
                setAuthState(prev => ({ ...prev, isLoading: false }));
            } finally { setIsGlobalLoading(false); }
        };
        checkAuthAndInit();
    }, [fetchAllScorecards]);

    const handleLogin = async (email, password) => {
        setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
        try {
            const result = await api.loginUser(email, password);
            await saveAuthData(result);
            setShowWelcome(true);
            setTimeout(() => { setShowWelcome(false); window.location.reload(); }, 2000);
        } catch (err) { setAuthState(prev => ({ ...prev, isLoading: false, error: err.message })); }
    };
    const handleLogout = async () => { await clearAuthData(); window.location.reload(); };

    const handleLayoutNavigate = (newViewName) => {
        if (activeMatchScorecardId && newViewName !== 'match_hub') {
            setNavigationTarget(newViewName); setIsExitModalVisible(true);
            return;
        }
        if (newViewName === 'match_hub' && !activeMatchScorecardId) navigateTo('match_select_scorecard');
        else navigateTo(newViewName);
    };
    const handleConfirmExitMatch = () => {
        setActiveMatchScorecardId(null); setMatchResult(null); setCurrentScrapedProfile(null); setIsMatchProfileLocked(false);
        if (navigationTarget) navigateTo(navigationTarget);
        setIsExitModalVisible(false); setNavigationTarget(null);
    };
    const handleCancelExitMatch = () => { setIsExitModalVisible(false); setNavigationTarget(null); };
    const handleChangeMatchScorecard = () => {
        setActiveMatchScorecardId(null); setMatchResult(null); setCurrentScrapedProfile(null); setIsMatchProfileLocked(false);
        navigateTo('match_select_scorecard');
    };

    const handleSaveScorecard = (scorecardData) => executeAsync(async () => {
        if (scorecardData.id) {
            await api.updateScorecard(scorecardData.id, scorecardData);
        } else {
            await api.createScorecard(scorecardData);
        }
        await fetchAllScorecards();
        goBack();
    });

    const handleDeleteScorecard = (id) => {
        if (window.confirm("Tem certeza que deseja excluir este modelo?")) {
            executeAsync(async () => {
                await api.deleteScorecard(id);
                await fetchAllScorecards();
            });
        }
    };

    const handleSaveScorecardAsTemplate = (interviewKit) => {
        if (!interviewKit) return;
        const templateData = {
            name: `Cópia de ${interviewKit.name}`,
            categories: interviewKit.skillCategories.map(cat => ({
                name: cat.name,
                criteria: (cat.skills || []).map(skill => ({ name: skill.name }))
            }))
        };
        navigateTo('scorecard_edit', { scorecard: templateData });
    };

    const filteredScorecards = useMemo(() => {
        if (!Array.isArray(scorecardTemplates)) return [];
        return scorecardTemplates.filter(sc => {
            const termMatch = !scorecardFilters.term || sc.name.toLowerCase().includes(scorecardFilters.term.toLowerCase());
            const atsMatch = scorecardFilters.ats === 'all' || sc.ats === scorecardFilters.ats;
            return termMatch && atsMatch;
        });
    }, [scorecardTemplates, scorecardFilters]);


    if (isGlobalLoading || authState.isLoading) return <LoadingView />;
    if (showWelcome) return <WelcomeView userName={authState.user?.name} />;
    if (globalError) return <ErrorView error={globalError} onRetry={() => window.location.reload()} />;
    if (!authState.isAuthenticated) return <LoginView onLogin={handleLogin} error={authState.error} isLoading={authState.isLoading} />;
    if (authState.user.role === 'admin') return <AdminDashboardView onLogout={handleLogout} />;

    let contentToRender;
    const viewsWithSidebar = ['dashboard_jobs', 'dashboard_talents', 'settings', 'job_details', 'candidate_details', 'talent_profile', 'scorecard_hub', 'scorecard_edit', 'match_hub', 'match_select_scorecard', 'extracted_text_view', 'update_pdf', 'batch_queue'];
    const useLayout = viewsWithSidebar.includes(view.name);

    switch (view.name) {
        case 'dashboard_jobs': contentToRender = <JobsDashboardView jobsData={jobsData} onSelectJob={workflow.handleSelectJobForDetails} activeStatusFilter={jobStatusFilter} onFilterChange={(s) => { setJobStatusFilter(s); fetchAndSetJobs(1, s) }} onNavigateToUpload={() => navigateTo('upload_pdf')} handleJobsPageChange={handleJobsPageChange} />; break;
        case 'talent_profile': contentToRender = <TalentProfileView talent={workflow.currentTalent} onBack={goBack} onEditTalent={workflow.handleEditTalentInfo} onDeleteTalent={workflow.handleDeleteTalent} onAddNewApplication={() => navigateTo('select_job_contextual_for_talent')} onDeleteApplication={workflow.handleRemoveApplicationForTalent} />; break;
        case 'match_hub': contentToRender = <MatchResultView activeScorecard={scorecardTemplates.find(sc => sc.id === activeMatchScorecardId)} matchResult={matchResult} isLoading={isScrapingForMatch} isLocked={isMatchProfileLocked} onToggleLock={handleToggleLock} onAddTalent={() => { if (!currentScrapedProfile) return; workflow.setProfileContext({ exists: false, profileData: currentScrapedProfile, talent: null }); navigateTo('select_job_for_new_talent'); }} onChangeScorecard={handleChangeMatchScorecard} />; break;
        case 'match_select_scorecard': contentToRender = <MatchView scorecards={scorecardTemplates} activeScorecardId={activeMatchScorecardId} onSelect={handleSelectMatchScorecard} onBatchSelect={handleStartBatchMode} onDeactivate={() => setActiveMatchScorecardId(null)} onGoToHub={() => navigateTo('scorecard_hub')} />; break;
        case 'dashboard_talents': contentToRender = <TalentsDashboardView talentsData={talentsData} onSelectTalent={workflow.handleSelectTalentForDetails} handleTalentsPageChange={handleTalentsPageChange} filters={filters} onFilterChange={setFilters} isPagingLoading={isPagingLoading} />; break;
        case 'job_details': contentToRender = <JobDetailsView job={workflow.currentJob} candidates={workflow.currentCandidates} onBack={goBack} onUpdateApplicationStatus={workflow.handleUpdateApplicationStatus} onSelectCandidateForDetails={workflow.handleSelectCandidateForDetails} availableStages={workflow.currentJobStages} />; break;
        case 'candidate_details': contentToRender = <CandidateDetailView candidate={workflow.currentTalent} job={workflow.currentJob} onBack={goBack} onUpdateStage={workflow.handleUpdateApplicationStatus} stages={workflow.currentJobStages} onGoToEdit={() => navigateTo('edit_candidate')} applicationCustomFields={workflow.applicationCustomFields} interviewKits={workflow.currentInterviewKits} initialState={view.state} scorecardSummary={scorecard.scorecardData?.content} scorecardHooks={scorecard} onUpdateRequest={workflow.handleRequestProfileUpdate} onSaveScorecardAsTemplate={handleSaveScorecardAsTemplate} />; break;
        case 'edit_candidate': contentToRender = <EditCandidateView candidate={workflow.currentTalent} onSave={workflow.handleEditTalentInfo} onCancel={goBack} applicationCustomFields={workflow.applicationCustomFields} />; break;
        case 'settings': contentToRender = <SettingsView settings={settings} onSettingChange={handleSettingChange} />; break;
        case 'ai_memory': contentToRender = <AIMemoryView />; break;
        case 'restart_required': contentToRender = <RestartView />; break;
        case 'scraping': contentToRender = <ScrapingView />; break;
        case 'select_job_for_new_talent': contentToRender = <JobsDashboardView isSelectionMode={true} jobsData={jobsData} onSelectJob={(job) => workflow.handleCreateAndGoToEvaluation(workflow.profileContext.profileData, job)} onBack={goBack} handleJobsPageChange={handleJobsPageChange} activeStatusFilter={jobStatusFilter} />; break;
        case 'confirm_profile': contentToRender = <ConfirmProfileView profileContext={workflow.profileContext} onConfirmCreation={workflow.handleConfirmCreation} onGoToProfile={workflow.handleSelectTalentForDetails} onGoToDashboard={() => navigateTo('dashboard_jobs')} onUpdateRequest={workflow.handleRequestProfileUpdate} />; break;
        case 'select_job_contextual_for_talent': contentToRender = <JobsDashboardView isSelectionMode={true} jobsData={jobsData} onSelectJob={(job) => workflow.handleApplyTalentToJob(job.id, workflow.currentTalent.id)} onBack={goBack} handleJobsPageChange={handleJobsPageChange} activeStatusFilter={jobStatusFilter} />; break;
        case 'upload_pdf': contentToRender = <UploadPdfView onFileSelect={workflow.handlePdfUpload} onBack={() => navigateTo('dashboard_jobs')} />; break;
        case 'update_pdf': contentToRender = <UpdatePdfView talent={workflow.currentTalent} onFileSelect={workflow.handlePdfUpdate} onCancel={goBack} />; break;
        case 'extracted_text_view': contentToRender = <ExtractedTextView text={view.state?.text || 'Nenhum texto encontrado.'} onBack={goBack} />; break;
        case 'scorecard_hub': contentToRender = <ScorecardHubView scorecards={filteredScorecards} onAddNew={() => navigateTo('scorecard_edit')} onEdit={(sc) => navigateTo('scorecard_edit', { scorecard: sc })} onDelete={handleDeleteScorecard} onFilterChange={(key, value) => setScorecardFilters(prev => ({ ...prev, [key]: value }))} />; break;
        case 'scorecard_edit': contentToRender = <ScorecardEditView initialData={view.state?.scorecard} onSave={handleSaveScorecard} onCancel={goBack} />; break;
        case 'batch_queue': contentToRender = <BatchQueueView scorecard={scorecardTemplates.find(sc => sc.id === view.state?.scorecardId)} queueState={batchQueue.queueState} onStartQueue={() => batchQueue.startQueue(view.state?.scorecardId)} onStopQueue={batchQueue.stopQueue} onAcceptProfile={(result) => { workflow.setProfileContext({ exists: false, profileData: result.profileData }); navigateTo('batch_select_job', { scorecardId: view.state?.scorecardId }); }} onRejectProfile={() => { }} onGoBack={() => navigateTo('match_select_scorecard')} />; break;
        case 'batch_select_job': contentToRender = <JobsDashboardView isSelectionMode={true} jobsData={jobsData} onSelectJob={async (job) => { await workflow.handleCreateAndGoToEvaluation(workflow.profileContext.profileData, job); navigateTo('batch_queue', { scorecardId: view.state?.scorecardId }); }} onBack={() => navigateTo('batch_queue', { scorecardId: view.state?.scorecardId })} handleJobsPageChange={handleJobsPageChange} activeStatusFilter={jobStatusFilter} />; break;
        default: contentToRender = <LoadingView />;
    }

    return (
        <div className={styles.appWrapper}>
            {useLayout ? (
                <Layout
                    activeView={view.name}
                    onNavigate={handleLayoutNavigate}
                    isSidebarCollapsed={!isSidebarOpen}
                    onToggleSidebar={() => setIsSidebarOpen(p => !p)}
                    onOpenInTab={settings?.isOpenInTabEnabled ? () => { if (window.chrome && chrome.runtime) { window.open(chrome.runtime.getURL('index.html')) } } : null}
                    onCaptureProfile={handleCaptureLinkedInProfile}
                    onLogout={handleLogout}
                    activeMatchScorecardName={scorecardTemplates.find(sc => sc.id === activeMatchScorecardId)?.name}
                >
                    <ProfileStatusNotification
                        status={validationResult}
                        onGoToProfile={workflow.handleSelectTalentForDetails}
                    />
                    {contentToRender}
                </Layout>
            ) : contentToRender}

            {isDraggingFile && !isMatchProfileLocked && <DragDropOverlay mode={activeMatchScorecardId ? 'match' : 'add'} />}

            <ExitMatchModeModal isOpen={isExitModalVisible} onConfirm={handleConfirmExitMatch} onCancel={handleCancelExitMatch} />
        </div>
    );
};

export default Popup;