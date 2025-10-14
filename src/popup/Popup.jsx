// COLE ESTE CÓDIGO NO ARQUIVO: src/popup/Popup.jsx

import React, { useState, useEffect, useCallback } from 'react';
import styles from './Popup.module.css';
import { saveSessionState } from '../services/session.service';

// Hooks
import { useApp } from '../hooks/useApp';
import { useNavigation } from '../hooks/useNavigation';
import { useJobs } from '../hooks/useJobs';
import { useTalents } from '../hooks/useTalents';
import { useWorkflow } from '../hooks/useWorkflow';
import { useScorecard } from '../hooks/useScorecard';

// Views e Componentes
import Layout from '../components/Layout/Layout';
import ConfirmProfileView from '../views/AddCandidate/ConfirmProfileView';
import JobsDashboardView from '../views/Manage/JobsDashboardView';
import JobDetailsView from '../views/Manage/JobDetailsView';
import CandidateDetailView from '../views/Manage/CandidateDetailView';
import EditCandidateView from '../views/Manage/EditCandidateView';
import TalentsDashboardView from '../views/Manage/TalentsDashboardView';
import TalentProfileView from '../views/Manage/TalentProfileView';
import SettingsView from '../views/Settings/SettingsView';
import RestartView from '../views/Shared/RestartView';
import ScorecardResultsView from '../components/Modals/ScorecardResultsView';
import InterviewKitModal from '../components/Modals/InterviewKitModal';
import CreateScorecardView from '../views/Shared/Scorecard/CreateScorecardView';
import ScorecardView from '../views/Shared/Scorecard/ScorecardView';

// Componentes de estado da UI
const LoadingView = () => ( <div className={styles.centeredContainer}><div className={styles.loadingSpinner}></div></div> );
const ErrorView = ({ error, onRetry }) => ( <div className={`${styles.centeredContainer} ${styles.errorContainer}`}><p className={styles.errorTitle}>Ocorreu um Erro</p><p className={styles.errorMessage}>{String(error)}</p><button onClick={onRetry} className={styles.retryButton}>Tentar Novamente</button></div> );

const Popup = () => {
    // --- ESTADO GLOBAL DE UI E EXECUÇÃO ---
    const [isGlobalLoading, setIsGlobalLoading] = useState(true);
    const [globalError, setGlobalError] = useState(null);
    const [isPagingLoading, setIsPagingLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [jobStatusFilter, setJobStatusFilter] = useState('open');

    const executeAsync = useCallback(async (asyncFunction, isPaging = false) => {
        if (isPaging && isPagingLoading) return;
        if (!isPaging) setGlobalError(null);
        isPaging ? setIsPagingLoading(true) : setIsGlobalLoading(true);
        try {
            await asyncFunction();
        } catch (err) {
            setGlobalError(err.message || 'Ocorreu um erro inesperado.');
        } finally {
            isPaging ? setIsPagingLoading(false) : setIsGlobalLoading(false);
        }
    }, [isPagingLoading]);

    // --- INSTANCIANDO OS HOOKS ---
    const { view, navigateTo, goBack, setView, history, setHistory } = useNavigation();
    const { settings, setSettings, isOnLinkedInProfile, initializeApp, handleSettingChange, handleCaptureLinkedInProfile } = useApp(executeAsync, navigateTo);
    const { jobsData, fetchAndSetJobs, handleJobsPageChange } = useJobs(executeAsync);
    const { talents, currentPage, nextPageKey, filters, setFilters, handleNextPage, handlePrevPage } = useTalents(executeAsync, view);
    const {
        profileContext, currentJob, currentTalent, currentCandidates, currentJobStages, currentApplication, applicationCustomFields,
        setProfileContext, setCurrentJob, setCurrentTalent, setCurrentApplication, setCurrentCandidates, setCurrentJobStages,
        handleSelectTalentForDetails, handleConfirmTalentCreation, handleSelectJobForDetails,
        handleSelectCandidateForDetails, handleUpdateApplicationStatus, handleEditTalentInfo,
        handleDeleteTalent, handleApplyTalentToJob, handleRemoveApplicationForTalent
    } = useWorkflow(executeAsync, navigateTo, goBack);

    const {
        isScorecardModalOpen, scorecardModalContent, scorecardData, selectedInterviewKit, currentEvaluationToEdit, aiAnalysisCache,
        handleAccessScorecard, handleStartNewEvaluation, handleCloseScorecard, handleSelectInterviewKit,
        handleCreateScorecardAndKit, handleScorecardSubmit, handleStartEditEvaluation, handleGoBackInScorecardFlow,
        handleSaveWeights, handleAIAssistScorecard, handleSyncProfile, handleCheckAICache, handleCacheAIResult,
    } = useScorecard({ executeAsync, settings, currentTalent, currentJob, currentApplication });

    // --- EFEITO DE INICIALIZAÇÃO ---
    const performInit = useCallback(async () => {
        setIsGlobalLoading(true);
        try {
            const initData = await initializeApp();
            setSettings(initData.settings);

            switch (initData.initialAction) {
                case 'LINKEDIN_PROFILE':
                    await fetchAndSetJobs(1, jobStatusFilter);
                    setProfileContext(initData.payload);
                    navigateTo(initData.payload.exists ? 'add_confirm' : 'select_job_for_new_talent');
                    break;
                case 'RESTORE_SESSION':
                    const savedState = initData.payload;
                    setView(savedState.view);
                    setHistory(savedState.history || []);
                    setCurrentJob(savedState.currentJob);
                    setCurrentTalent(savedState.currentTalent);
                    setCurrentApplication(savedState.currentApplication);
                    setCurrentCandidates(savedState.currentCandidates || []);
                    setCurrentJobStages(savedState.currentJobStages || []);
                    setProfileContext(savedState.profileContext);
                    setFilters(savedState.talentSearchFilters);
                    await fetchAndSetJobs(1, jobStatusFilter);
                    break;
                case 'FRESH_START':
                default:
                    await fetchAndSetJobs(1, jobStatusFilter);
                    navigateTo('dashboard_jobs');
                    break;
            }
        } catch (err) {
            setGlobalError(err.message || 'Falha ao inicializar a aplicação.');
        } finally {
            setIsGlobalLoading(false);
        }
    }, [initializeApp]);

    useEffect(() => {
        performInit();
    }, [performInit]);

    // --- EFEITO PARA SALVAR SESSÃO ---
    useEffect(() => {
        if (view === 'loading' || !settings?.isPersistenceEnabled) return;
        const stateToSave = { 
            view, currentJob, currentTalent, currentApplication, currentCandidates, 
            currentJobStages, profileContext, history, nextPageKey, filters 
        };
        saveSessionState(stateToSave);
    }, [view, currentJob, currentTalent, settings, history, currentApplication, currentCandidates, currentJobStages, profileContext, nextPageKey, filters]);

    // --- FUNÇÕES DE CONEXÃO ---
    const handleJobFilterChange = (newStatus) => {
        setJobStatusFilter(newStatus);
        fetchAndSetJobs(1, newStatus);
    };

    const handleLayoutNavigate = (newView) => {
        if (newView === 'dashboard_jobs') {
            fetchAndSetJobs(1, jobStatusFilter);
            navigateTo('dashboard_jobs');
        } else if (newView === 'dashboard_talents') {
            setFilters({ searchTerm: '', selectedJobId: '' });
            navigateTo('dashboard_talents');
        } else {
            navigateTo(newView);
        }
    };

    const handleOpenInTab = () => {
        try {
            chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
        } catch (e) { console.error("Erro ao abrir em nova aba:", e); }
    };

    // --- FUNÇÃO DE RENDERIZAÇÃO DO MODAL ---
    const renderScorecardModal = () => {
        if (!isScorecardModalOpen) return null;

        switch (scorecardModalContent) {
            case 'results':
                return <ScorecardResultsView results={scorecardData.content} onClose={handleCloseScorecard} onEdit={handleStartEditEvaluation} />;
            case 'select_kit':
                return <InterviewKitModal kits={scorecardData.content} onSelect={handleSelectInterviewKit} onClose={handleCloseScorecard} />;
            case 'create':
                return <CreateScorecardView job={currentJob} application={currentApplication} onSubmit={handleCreateScorecardAndKit} onCancel={handleCloseScorecard} />;
            case 'evaluate':
                 return <ScorecardView 
                    candidate={currentTalent} 
                    job={currentJob} 
                    scorecard={selectedInterviewKit} 
                    onSubmit={handleScorecardSubmit} 
                    onCancel={handleGoBackInScorecardFlow} 
                    initialEvaluationData={currentEvaluationToEdit} 
                    isAIEnabled={settings.isAIEnabled}
                    onAIAssistScorecard={handleAIAssistScorecard}
                    onCheckCache={handleCheckAICache}
                    onSyncProfile={handleSyncProfile}
                    onSaveWeights={handleSaveWeights}
                    aiAnalysisCache={aiAnalysisCache}
                    onCacheAIResult={handleCacheAIResult}
                 />;
            default:
                return <div className={styles.centeredContainer}><div className={styles.loadingSpinner}></div></div>;
        }
    };

    // --- RENDERIZAÇÃO PRINCIPAL ---
    const viewsWithSidebar = ['dashboard_jobs', 'dashboard_talents', 'settings', 'job_details', 'candidate_details', 'talent_profile'];
    
    const renderContent = () => {
        if (view === 'loading' || !settings || isGlobalLoading) return <LoadingView />;
        if (globalError) return <ErrorView error={globalError} onRetry={performInit} />;
        
        let contentToRender;
        const useLayout = viewsWithSidebar.includes(view);
    
        switch (view) {
          case 'dashboard_jobs':
            contentToRender = <JobsDashboardView 
                jobsData={jobsData} 
                onSelectJob={handleSelectJobForDetails} 
                onPageChange={(newPage) => handleJobsPageChange(newPage, jobStatusFilter)}
                activeStatusFilter={jobStatusFilter}
                onFilterChange={handleJobFilterChange}
              />;
            break;
          case 'job_details':
            contentToRender = <JobDetailsView 
                job={currentJob} 
                candidates={currentCandidates} 
                availableStages={currentJobStages} 
                onSelectCandidateForDetails={handleSelectCandidateForDetails} 
                onUpdateApplicationStatus={handleUpdateApplicationStatus} 
                onBack={goBack} 
              />;
            break;
          case 'dashboard_talents':
            contentToRender = <TalentsDashboardView 
              talents={talents} 
              onSelectTalent={handleSelectTalentForDetails} 
              onNextPage={handleNextPage}
              onPrevPage={handlePrevPage}
              hasNextPage={!!nextPageKey}
              hasPrevPage={currentPage > 1}
              currentPage={currentPage}
              totalTalentsText={`${talents.length} talentos nesta página`}
              isPagingLoading={isPagingLoading} 
              searchTerm={filters.searchTerm} 
              selectedJobId={filters.selectedJobId} 
              onFilterChange={setFilters} 
              jobs={jobsData.jobs} 
              isLoading={isGlobalLoading && talents.length === 0} 
            />;
            break;
          case 'talent_profile':
             contentToRender = <TalentProfileView 
               talent={currentTalent} 
               onEditTalent={handleEditTalentInfo} 
               onDeleteTalent={handleDeleteTalent} 
               onAddNewApplication={(talentId) => {
                  setCurrentTalent(prev => ({ ...prev, id: talentId })); 
                  navigateTo('select_job_contextual_for_talent');
               }} 
               onDeleteApplication={handleRemoveApplicationForTalent} 
               onBack={goBack} 
             />;
            break;
          case 'settings':
            contentToRender = <SettingsView
                settings={settings}
                onSettingChange={(key, value) => handleSettingChange(key, value, navigateTo)}
              />;
            break;
          case 'add_confirm':
            contentToRender = <ConfirmProfileView 
                profileContext={profileContext} 
                onConfirmCreation={() => handleConfirmTalentCreation(profileContext.profileData)} 
                onGoToProfile={() => handleSelectTalentForDetails(profileContext.talent)} 
                onGoToDashboard={() => handleLayoutNavigate('dashboard_jobs')} 
              />;
            break;
          case 'select_job_for_new_talent':
              contentToRender = <JobsDashboardView
                  isSelectionMode={true}
                  jobsData={jobsData}
                  onSelectJob={(selectedJob) => handleConfirmTalentCreation(profileContext.profileData, selectedJob.id)}
                  onPageChange={(newPage) => handleJobsPageChange(newPage, jobStatusFilter)}
                  onBack={() => navigateTo('dashboard_jobs')}
              />;
              break;
          case 'select_job_contextual_for_talent':
              contentToRender = <JobsDashboardView 
                  isSelectionMode={true} 
                  jobsData={jobsData} 
                  onSelectJob={async (job) => await handleApplyTalentToJob(job.id, currentTalent.id)} 
                  onPageChange={(newPage) => handleJobsPageChange(newPage, jobStatusFilter)}
                  onBack={goBack} 
              />;
              break;
          case 'candidate_details':
              contentToRender = <CandidateDetailView 
                  candidate={currentTalent} 
                  job={currentJob} 
                  stages={currentJobStages} 
                  onBack={goBack} 
                  onUpdateStage={handleUpdateApplicationStatus} 
                  onGoToEdit={() => navigateTo('edit_candidate')}
                  onAccessScorecard={handleAccessScorecard} 
                  onStartNewEvaluation={handleStartNewEvaluation}
                  applicationCustomFields={applicationCustomFields} 
              />;
              break;
          case 'edit_candidate': 
              contentToRender = <EditCandidateView
                  candidate={currentTalent} 
                  onSave={handleEditTalentInfo}
                  onCancel={goBack}
                  applicationCustomFields={applicationCustomFields} 
              />;
              break;
          case 'restart_required':
              contentToRender = <RestartView />;
              break;
          default:
            contentToRender = <LoadingView />;
        }
        
        const mainUI = useLayout ? (
            <Layout
              activeView={view}
              onNavigate={handleLayoutNavigate}
              isSidebarCollapsed={!isSidebarOpen}
              onToggleSidebar={() => setIsSidebarOpen(p => !p)}
              onOpenInTab={settings.isOpenInTabEnabled ? handleOpenInTab : null}
              onCaptureProfile={isOnLinkedInProfile ? () => handleCaptureLinkedInProfile(setProfileContext) : null}
            >
              {contentToRender}
            </Layout>
        ) : contentToRender;
    
        return (
          <div className={styles.appWrapper}>
            {mainUI}
            {renderScorecardModal()}
          </div>
        );
      };
      
      return renderContent();
};

export default Popup;