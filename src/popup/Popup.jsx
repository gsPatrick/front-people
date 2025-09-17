// src/popup/Popup.jsx

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import styles from './Popup.module.css';
import * as api from '../services/api.service';
import { saveSessionState, loadSessionState, saveSettings, loadSettings } from '../services/session.service';

// Componentes e Views
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


const LoadingView = () => ( <div className={styles.centeredContainer}><div className={styles.loadingSpinner}></div></div> );
const ErrorView = ({ error, onRetry }) => ( <div className={`${styles.centeredContainer} ${styles.errorContainer}`}><p className={styles.errorTitle}>Ocorreu um Erro</p><p className={styles.errorMessage}>{String(error)}</p><button onClick={onRetry} className={styles.retryButton}>Tentar Novamente</button></div> );

const PAGE_LIMIT = 15;

const Popup = () => {
    const [isOnLinkedInProfile, setIsOnLinkedInProfile] = useState(false);
    const [view, setView] = useState('loading');
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [settings, setSettings] = useState(null);
    const [isPagingLoading, setIsPagingLoading] = useState(false);
    const [error, setError] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [talents, setTalents] = useState([]);
    const [talentsNextPageKey, setTalentsNextPageKey] = useState(null); 
    const [talentSearchFilters, setTalentSearchFilters] = useState({ searchTerm: '', selectedJobId: '' }); 

    const searchDebounceRef = useRef(null);

    const [profileContext, setProfileContext] = useState(null);
    const [currentJob, setCurrentJob] = useState(null);
    const [currentTalent, setCurrentTalent] = useState(null);
    const [currentCandidates, setCurrentCandidates] = useState([]);
    const [currentJobStages, setCurrentJobStages] = useState([]);
    const [currentApplication, setCurrentApplication] = useState(null);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isScorecardModalOpen, setIsScorecardModalOpen] = useState(false);
    const [scorecardModalContent, setScorecardModalContent] = useState(null);
    const [scorecardData, setScorecardData] = useState(null);
    const [selectedInterviewKit, setSelectedInterviewKit] = useState(null);
    const [currentEvaluationToEdit, setCurrentEvaluationToEdit] = useState(null);
    const [aiAnalysisCache, setAiAnalysisCache] = useState({});

    const viewsWithSidebar = ['dashboard_jobs', 'dashboard_talents', 'settings', 'job_details', 'candidate_details', 'talent_profile'];

    useEffect(() => {
        const checkCurrentTab = async () => {
            try {
                const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (activeTab?.url && activeTab.url.includes("linkedin.com/in/")) {
                    setIsOnLinkedInProfile(true);
                } else {
                    setIsOnLinkedInProfile(false);
                }
            } catch (e) {
                console.warn("Não foi possível verificar a aba:", e.message);
                setIsOnLinkedInProfile(false);
            }
        };

        checkCurrentTab();
        chrome.tabs.onUpdated.addListener(checkCurrentTab);
        chrome.tabs.onActivated.addListener(checkCurrentTab);

        return () => {
            chrome.tabs.onUpdated.removeListener(checkCurrentTab);
            chrome.tabs.onActivated.removeListener(checkCurrentTab);
        };
    }, []);


    const navigateTo = (newView) => {
        setHistory(prev => [...prev.slice(-5), view]);
        setView(newView);
        setError(null);
    };

    const goBack = useCallback(() => {
        const previousView = history.pop() || 'dashboard_jobs'; 
        setHistory([...history]);
        setView(previousView);
    }, [history]);
    
    const executeAsync = useCallback(async (asyncFunction, isPaging = false) => {
        if (isPaging && isPagingLoading) return;
        
        if (!isPaging) {
            setIsLoading(true); 
            setError(null);
        } else {
            setIsPagingLoading(true);
        }

        try {
            await asyncFunction();
        } catch (err) {
            setError(err.message || 'Ocorreu um erro inesperado.');
        } finally {
            if (!isPaging) setIsLoading(false);
            setIsPagingLoading(false);
        }
    }, [isPagingLoading]); 

    useEffect(() => {
        if (view === 'loading' || !settings?.isPersistenceEnabled) return;
        const stateToSave = { view, currentJob, currentTalent, currentApplication, currentCandidates, currentJobStages, profileContext, history, talentsNextPageKey, talentSearchFilters }; 
        saveSessionState(stateToSave);
    }, [view, currentJob, currentTalent, settings, history, currentApplication, currentCandidates, currentJobStages, profileContext, talentsNextPageKey, talentSearchFilters]); 
    
    const fetchTalentsWithFilters = useCallback(async (currentFilters, nextPage = null) => {
        try {
            const result = await api.fetchAllTalents(PAGE_LIMIT, nextPage); 

            if (result.success && result.data && Array.isArray(result.data.talents)) {
                let fetchedTalents = result.data.talents;

                if (currentFilters.searchTerm) {
                    fetchedTalents = fetchedTalents.filter(t => 
                        t.name?.toLowerCase().includes(currentFilters.searchTerm.toLowerCase()) ||
                        t.headline?.toLowerCase().includes(currentFilters.searchTerm.toLowerCase()) || 
                        t.linkedinUsername?.toLowerCase().includes(currentFilters.searchTerm.toLowerCase())
                    );
                }
                if (currentFilters.selectedJobId) {
                    console.warn("Filtro por JobId para talentos não implementado na API paginada. Exibindo todos os talentos carregados.");
                }

                fetchedTalents = fetchedTalents.filter(t => t && typeof t.id === 'string' && t.id.length > 0 && t.id !== 'paginated');
                
                setTalents(prev => nextPage ? [...prev, ...fetchedTalents] : fetchedTalents);
                setTalentsNextPageKey(result.data.nextPageKey); 

            } else {
                setTalents([]); 
                setTalentsNextPageKey(null);
            }
        } catch (err) {
            setError(err.message || "Erro ao buscar talentos.");
            setTalents([]);
            setTalentsNextPageKey(null);
        } 
    }, []); 

    useEffect(() => {
        if (searchDebounceRef.current) {
            clearTimeout(searchDebounceRef.current);
        }

        if (view === 'dashboard_talents') {
            if (isPagingLoading) return; 

            searchDebounceRef.current = setTimeout(() => {
                executeAsync(() => fetchTalentsWithFilters(talentSearchFilters, null)); 
            }, 500); 
        } else {
            setTalents([]);
            setTalentsNextPageKey(null);
        }

        return () => {
            if (searchDebounceRef.current) {
                clearTimeout(searchDebounceRef.current);
            }
        };
    }, [talentSearchFilters, view, fetchTalentsWithFilters, executeAsync, isPagingLoading]); 

    const handleLoadMoreTalents = useCallback(async () => {
        if (!talentsNextPageKey || isPagingLoading) return; 
        executeAsync(() => fetchTalentsWithFilters(talentSearchFilters, talentsNextPageKey), true); 
    }, [talentsNextPageKey, isPagingLoading, talentSearchFilters, fetchTalentsWithFilters, executeAsync]);

    const handleFilterChange = useCallback((newFilters) => {
        setTalentSearchFilters(newFilters);
    }, []);

    const fetchAndSetJobs = async () => {
      const jobsData = await api.fetchJobs();
      setJobs(jobsData);
      return jobsData; 
    };

    const handleSelectTalentForDetails = useCallback((talent) => executeAsync(async () => {
        const talentResult = await api.fetchTalentDetails(talent.id);
        if (talentResult.success && talentResult.talent) {
            const talentData = talentResult.talent;
            setCurrentTalent(talentData);
            navigateTo('talent_profile');
        } else {
            throw new Error(talentResult.error || "Talento não encontrado.");
        }
    }), [executeAsync]);

    const initializeApp = useCallback(() => {
      executeAsync(async () => {
        const loadedSettings = await loadSettings();
        const defaultSettings = {
            isSidePanelModeEnabled: true,
            isPersistenceEnabled: false,
            isOpenInTabEnabled: false,
            isAIEnabled: false
        };
        const currentSettings = { ...defaultSettings, ...loadedSettings };
        setSettings(currentSettings);

        let linkedInUrl = null;
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs && tabs.length > 0) linkedInUrl = tabs[0].url;
        } catch (e) { console.warn("Não foi possível acessar a URL da aba (normal em dev)."); }
  
        if (linkedInUrl && linkedInUrl.includes("linkedin.com/in/")) {
            const validationResult = await api.validateProfile(linkedInUrl);
            setProfileContext(validationResult);

            if (validationResult.exists) {
                navigateTo('add_confirm');
            } else {
                await fetchAndSetJobs();
                navigateTo('select_job_for_new_talent');
            }
            return;
        }
        
        if (currentSettings.isPersistenceEnabled) {
            const savedState = await loadSessionState();
            if (savedState && savedState.view !== 'loading') {
                setCurrentJob(savedState.currentJob);
                setCurrentTalent(savedState.currentTalent);
                setCurrentApplication(savedState.currentApplication);
                setCurrentCandidates(savedState.currentCandidates || []);
                setCurrentJobStages(savedState.currentJobStages || []);
                setProfileContext(savedState.profileContext);
                setHistory(savedState.history || []);
                setTalentSearchFilters(savedState.talentSearchFilters); 
                setView(savedState.view);
                await fetchAndSetJobs();
                return;
            }
        }

        await fetchAndSetJobs(); 
        setTalentSearchFilters({ searchTerm: '', selectedJobId: '' }); 
        navigateTo('dashboard_jobs');
      });
    }, [executeAsync]);
    
    useEffect(() => {
      initializeApp();
    }, [initializeApp]);

    const handleSettingChange = async (key, value) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        await saveSettings(newSettings);

        if (key === 'isSidePanelModeEnabled') {
            try {
                chrome.runtime.reload();
            } catch (e) {
                console.error("Falha ao recarregar a extensão:", e);
                navigateTo('restart_required');
            }
        }
    };

    const handleCaptureLinkedInProfile = useCallback(() => executeAsync(async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.url && tab.url.includes("linkedin.com/in/")) {
            const validationResult = await api.validateProfile(tab.url);
            setProfileContext(validationResult);
            navigateTo('add_confirm');
        } else {
            alert("Para capturar, por favor, navegue até um perfil válido no LinkedIn.");
        }
    }), [executeAsync]);

    const handleSelectAllJobs = useCallback(() => executeAsync(async () => {
        await fetchAndSetJobs(); 
        navigateTo('dashboard_jobs');
    }), [executeAsync]);
    
    const handleLayoutNavigate = (newView) => {
        if (newView === 'dashboard_jobs') handleSelectAllJobs();
        if (newView === 'dashboard_talents') {
            setTalentSearchFilters({ searchTerm: '', selectedJobId: '' }); 
            navigateTo('dashboard_talents'); 
        }
        if (newView === 'settings') navigateTo(newView);
    };

    const handleConfirmTalentCreation = useCallback((talentData, jobIdToApply = null) => executeAsync(async () => { 
        const payload = { ...talentData, jobId: jobIdToApply };
        const newTalent = await api.createTalent(payload);
        await fetchAndSetJobs(); 
        await handleSelectTalentForDetails(newTalent);
    }), [executeAsync, handleSelectTalentForDetails]);
    
    const handleSelectJobForDetails = useCallback((job) => executeAsync(async () => {
        const result = await api.fetchCandidatesForJob(job.id);
        setCurrentJob(job);
        setCurrentCandidates(result.data.candidates);
        setCurrentJobStages(result.data.stages);
        navigateTo('job_details');
    }), [executeAsync]);
    
    const handleSelectCandidateForDetails = useCallback((candidate, job) => executeAsync(async () => {
        const result = await api.fetchCandidateDetails(job.id, candidate.id);
        const { candidateData } = result;
        setCurrentApplication(candidateData.application);
        setCurrentTalent(candidateData);
        setCurrentJob(job);
        navigateTo('candidate_details');
    }), [executeAsync]);

    const handleUpdateApplicationStatus = useCallback((applicationId, newStageId) => executeAsync(async () => {
        await api.updateApplicationStatus(applicationId, newStageId);
        await handleSelectJobForDetails(currentJob);
    }), [executeAsync, currentJob, handleSelectJobForDetails]);
  
    const handleEditTalentInfo = useCallback(async (talentId, talentUpdates, applicationCustomFields) => {
        await executeAsync(async () => {
            if (talentUpdates && Object.keys(talentUpdates).length > 0) {
                await api.updateTalent(talentId, talentUpdates);
            }
            if (applicationCustomFields && applicationCustomFields.length > 0 && currentApplication?.id) {
                await api.updateApplicationCustomFields(currentApplication.id, applicationCustomFields);
            }
            
            const result = await api.fetchCandidateDetails(currentJob.id, talentId);
            const { candidateData } = result;

            setCurrentApplication(candidateData.application);
            setCurrentTalent(candidateData);
            
            alert("Informações atualizadas com sucesso!");
            
            goBack();
        });
    }, [executeAsync, currentApplication, currentJob, goBack]);

    const handleDeleteTalent = useCallback((talentId) => executeAsync(async () => {
        const result = await api.deleteTalent(talentId);
        if (result.success) { 
            alert("Talento deletado com sucesso!");
            setTalentSearchFilters({ searchTerm: '', selectedJobId: '' }); 
            navigateTo('dashboard_talents'); 
        } else {
            throw new Error(result.message || "Falha ao deletar talento.");
        }
    }), [executeAsync]);

    const handleApplyTalentToJob = useCallback((jobId, talentId) => executeAsync(async () => {
        const result = await api.applyToJob(jobId, talentId);
        if (result.id) { 
            alert("Talento adicionado à vaga com sucesso!");
            await handleSelectTalentForDetails({ id: talentId });
        } else {
            throw new Error(result.message || "Falha ao adicionar talento à vaga.");
        }
    }), [executeAsync, handleSelectTalentForDetails]);

    const handleRemoveApplicationForTalent = useCallback((applicationId, talentId) => executeAsync(async () => {
        if (window.confirm("Tem certeza que deseja remover esta candidatura?")) {
            const result = await api.removeApplication(applicationId);
            if (result.success) { 
                alert("Candidatura removida com sucesso!");
                await handleSelectTalentForDetails({ id: talentId });
            } else {
                throw new Error(result.message || "Falha ao remover candidatura.");
            }
        }
    }), [executeAsync, handleSelectTalentForDetails]);

    const handleGoToEditCandidate = () => {
        navigateTo('edit_candidate');
    };
    
    const handleOpenInTab = () => {
        try {
            chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
        } catch (e) {
            console.error("Erro ao abrir em nova aba:", e);
            alert("Esta funcionalidade só está disponível na extensão instalada.");
        }
    };

    const handleCloseScorecard = () => {
        setIsScorecardModalOpen(false);
        setScorecardData(null);
        setSelectedInterviewKit(null);
        setCurrentEvaluationToEdit(null);
    };

    const handleAccessScorecard = useCallback((application, job) => {
        executeAsync(async () => {
            setCurrentApplication(application);
            setCurrentJob(job);
            const result = await api.fetchScorecardData(application.id, job.id);
            if (result.success && result.data) {
                setScorecardData(result.data);
                setScorecardModalContent('results');
                setIsScorecardModalOpen(true);
            } else {
                throw new Error(result.error || "Não foi possível carregar o resumo do scorecard.");
            }
        });
    }, [executeAsync]);
    
    const handleStartNewEvaluation = useCallback((application, job) => {
        executeAsync(async () => {
            setCurrentApplication(application);
            setCurrentJob(job);
            
            const result = await api.fetchKitsForJob(job.id);
            setScorecardData({ type: 'kits', content: result });

            if (result && result.length > 0) {
                setScorecardModalContent('select_kit');
            } else {
                setScorecardModalContent('create');
            }
            setIsScorecardModalOpen(true);
        });
    }, [executeAsync]);
    
    const handleSelectInterviewKit = (kit) => {
        setSelectedInterviewKit(kit);
        setScorecardModalContent('evaluate');
    };

    const handleCreateScorecardAndKit = useCallback((payload) => {
        executeAsync(async () => {
            const result = await api.createScorecardAndKit(payload);
            if(result.success && result.kit){
                setSelectedInterviewKit(result.kit);
                setScorecardModalContent('evaluate');
            } else {
                throw new Error(result.error || "Falha ao criar Scorecard e Kit.")
            }
        });
    }, [executeAsync]);

    const handleScorecardSubmit = useCallback((evaluationData) => {
        executeAsync(async () => {
            const scorecardId = selectedInterviewKit.id;
            const applicationId = currentApplication.id;
            await api.submitScorecard(applicationId, scorecardId, evaluationData);
            alert("Avaliação enviada com sucesso!");
            handleCloseScorecard();
        });
    }, [executeAsync, selectedInterviewKit, currentApplication]);

    const handleCacheAIResult = useCallback((cacheKey, result) => {
        setAiAnalysisCache(prevCache => ({
            ...prevCache,
            [cacheKey]: result
        }));
    }, []);

    const handleStartEditEvaluation = useCallback((evaluation) => {
        executeAsync(async () => {
            const kitId = evaluation.scorecardInterviewId;
            if (!kitId) throw new Error("ID do kit não encontrado na avaliação.");
            const result = await api.fetchInterviewKit(kitId);
            if(result.success && result.kit){
                setSelectedInterviewKit(result.kit);
                setCurrentEvaluationToEdit(evaluation);
                setScorecardModalContent('evaluate');
                setIsScorecardModalOpen(true);
            } else {
                throw new Error(result.error || "Não foi possível carregar a estrutura do kit para edição.")
            }
        });
    }, [executeAsync]);

    const handleGoBackInScorecardFlow = () => {
        setCurrentEvaluationToEdit(null);
        if (scorecardData?.type === 'summary') {
            setScorecardModalContent('results');
        } else {
            handleCloseScorecard();
        }
    };
    
    const handleSaveWeights = useCallback(async (kitId, weights) => {
        try {
            await api.saveKitWeights(kitId, weights);
            console.log(`Pesos para o kit ${kitId} foram salvos em segundo plano.`);
        } catch (err) {
            console.error("Falha ao salvar os pesos em segundo plano:", err.message);
        }
    }, []);

   const handleAIAssistScorecard = useCallback(async (scorecard, weights) => {
        if (!currentTalent || !currentTalent.id || !currentJob) {
            alert("Contexto incompleto para a análise de IA.");
            return null;
        }
        return await api.evaluateScorecardWithAI(currentTalent.id, currentJob, scorecard, weights);
    }, [currentTalent, currentJob]);

    const handleSyncProfile = useCallback(async () => {
        if (!currentTalent || !currentTalent.id) {
            alert("ID do talento não encontrado.");
            return null;
        }
        return await api.syncLinkedInProfile(currentTalent.id);
    }, [currentTalent]);
    
    const handleCheckAICache = useCallback(async () => {
        if (!currentTalent || !currentTalent.id) return { hasCache: false };
        return await api.checkAICacheStatus(currentTalent.id);
    }, [currentTalent]);

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

    const applicationCustomFields = useMemo(() => {
        return currentTalent?.application?.customFields || [];
    }, [currentTalent]);
  
    const renderContent = () => {
      if (view === 'loading' || !settings) return <LoadingView />;
      if (error) return <ErrorView error={error} onRetry={initializeApp} />;
      
      let contentToRender;
      const useLayout = viewsWithSidebar.includes(view);
  
      switch (view) {
        case 'dashboard_jobs':
          contentToRender = <JobsDashboardView jobs={jobs} onSelectJob={handleSelectJobForDetails} />;
          break;
        case 'job_details':
          contentToRender = <JobDetailsView job={currentJob} candidates={currentCandidates} availableStages={currentJobStages} onSelectCandidateForDetails={handleSelectCandidateForDetails} onUpdateApplicationStatus={handleUpdateApplicationStatus} onBack={goBack} />;
          break;
        case 'dashboard_talents':
          contentToRender = <TalentsDashboardView 
            talents={talents} 
            onSelectTalent={handleSelectTalentForDetails} 
            onLoadMore={handleLoadMoreTalents} 
            hasNextPage={!!talentsNextPageKey} 
            isPagingLoading={isPagingLoading} 
            searchTerm={talentSearchFilters.searchTerm} 
            selectedJobId={talentSearchFilters.selectedJobId} 
            onFilterChange={handleFilterChange} 
            jobs={jobs} 
            isLoading={isLoading} 
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
              onSettingChange={handleSettingChange}
            />;
          break;
        case 'add_confirm':
          contentToRender = <ConfirmProfileView profileContext={profileContext} onConfirmCreation={() => handleConfirmTalentCreation(profileContext.profileData)} onGoToProfile={() => handleSelectTalentForDetails(profileContext.talent)} onGoToDashboard={handleSelectAllJobs} />;
          break;
        case 'select_job_for_new_talent':
            contentToRender = <JobsDashboardView
                isSelectionMode={true}
                jobs={jobs}
                onSelectJob={(selectedJob) => {
                    handleConfirmTalentCreation(profileContext.profileData, selectedJob.id);
                }}
                onBack={() => navigateTo('dashboard_jobs')}
            />;
            break;
        case 'select_job_contextual_for_talent':
            contentToRender = <JobsDashboardView 
                isSelectionMode={true} 
                jobs={jobs} 
                onSelectJob={async (job) => {
                    await handleApplyTalentToJob(job.id, currentTalent.id);
                }} 
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
                onGoToEdit={handleGoToEditCandidate}
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
            onCaptureProfile={isOnLinkedInProfile ? handleCaptureLinkedInProfile : null}
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