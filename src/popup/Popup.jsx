/* global chrome */
// ARQUIVO COMPLETO E CORRIGIDO: src/popup/Popup.jsx

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import styles from './Popup.module.css';
import { loadAuthData, saveAuthData, clearAuthData } from '../services/session.service';
import * as api from '../services/api.service';

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
import BatchQueueView from '../views/Match/BatchQueueView';
import CandidateListView from '../views/Manage/CandidateListView'; // IMPORTADO
import EditJobView from '../views/Manage/EditJobView'; // NOVO
import ExtractedTextView from '../views/Shared/ExtractedTextView';
import ProfileStatusNotification from '../components/Layout/ProfileStatusNotification';
import { ToastProvider, useToast } from '../contexts/ToastContext';

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
    const [scorecardTemplates, setScorecardTemplates] = useState([]);
    const [availableAreas, setAvailableAreas] = useState([]); // NOVA
    const [jobCustomFields, setJobCustomFields] = useState([]); // NOVA
    const [scorecardFilters, setScorecardFilters] = useState({ term: '', ats: 'all' });

    const [isDraggingFile, setIsDraggingFile] = useState(false);
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

    const { settings, setSettings, currentTab, handleSettingChange, validationResult } = useApp(executeAsync, navigateTo);
    const workflow = useWorkflow(executeAsync, navigateTo, goBack);

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
    }, [validationResult, workflow]); 

    const { jobsData, fetchAndSetJobs, handleJobsPageChange, handleDeleteJob } = useJobs(executeAsync);
    const { talentsData, filters, setFilters, handleTalentsPageChange } = useTalents(executeAsync, view);
    const { addToast, removeToast } = useToast() || {}; // Hook at top level

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

    const fetchJobFormMetadata = useCallback(async () => {
        try {
            const [areas, customFields] = await Promise.all([
                api.fetchAreas(),
                api.fetchCustomFieldsForEntity('JOBS')
            ]);
            setAvailableAreas(areas || []);
            setJobCustomFields(customFields || []);
        } catch (err) {
            console.error("Erro ao carregar metadados do formulário de vagas:", err);
        }
    }, []);

    useEffect(() => {
        if (!chrome.runtime) return;
        const messageListener = (message) => {
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
    }, [navigateTo, workflow, batchQueue.queueState.isRunning, goBack]);

    // NOVO: Efeito para tratar o Auto-Retorno após Análise Individual via Busca
    useEffect(() => {
        if (view.name === 'batch_queue' && view.state?.isSingleUpdate) {
            const { isRunning, results } = batchQueue.queueState;
            // Só dispara se parou de rodar e temos exatamente 1 resultado de sucesso
            if (!isRunning && results.length === 1 && results[0] && !results[0].error) {
                const result = results[0];
                console.log("[POPUP] Análise individual concluída via busca. Aplicando e voltando...");

                // Dispara a atualização (que internamente chama goBack ao finalizar)
                workflow.handleProfileUpdateFromExtraction(
                    {
                        ...result.profileData,
                        linkedinUrl: result.url,
                        linkedinUsername: result.username
                    },
                    {
                        result: result.matchResult,
                        scorecardId: view.state.scorecardId
                    }
                );
            }
        }
    }, [batchQueue.queueState, view.name, view.state?.isSingleUpdate, view.state?.scorecardId, workflow]);



    const handleCaptureProfileVisual = useCallback(async () => {
        if (!currentTab || !currentTab.url || !currentTab.url.includes("linkedin.com/in/")) {
            alert("Para capturar um perfil, navegue até uma página de perfil do LinkedIn.");
            return;
        }

        const url = currentTab.url;
        const match = url.match(/linkedin\.com\/in\/([^/?]+)/);
        const username = match ? match[1].replace(/\/+$/, '') : 'unknown';

        const name = (currentTab.title && currentTab.title.includes('|'))
            ? currentTab.title.split('|')[0].trim()
            : username;

        const singleTab = {
            id: currentTab.id,
            url: url,
            username: username,
            name: name,
            status: 'pending'
        };

        navigateTo('match_select_scorecard', {
            mode: 'single_capture',
            captureTab: singleTab
        });
    }, [currentTab, navigateTo]);

    // Removido handleToggleLock

    const handleSelectMatchScorecard = useCallback((scorecardId) => {
        const sc = scorecardTemplates.find(s => s.id === scorecardId);
        
        // Se o scorecard já tem uma vaga vinculada, pula a seleção de vaga e vai direto para a fila
        if (sc && sc.jobId) {
            const job = { id: sc.jobId, name: sc.job?.name || sc.job?.title || 'Vaga Vinculada' };
            
            // Detecta abas do LinkedIn e vai para a fila
            batchQueue.detectLinkedInTabs().then((tabs) => {
                navigateTo('batch_queue', {
                    scorecardId: scorecardId,
                    jobId: sc.jobId,
                    job: job,
                    autoOpenSearch: tabs.length === 0 // Abre busca se não houver abas
                });
            });
        } else {
            // Se não tem vaga, vai para a seleção de vaga (comportamento legado para scorecards sem vínculo)
            navigateTo('match_select_job_pre_queue', { scorecardId });
        }
    }, [scorecardTemplates, navigateTo, batchQueue]);

    // handleStartBatchMode removido pois é redundante

    // Removido useEffect que redirecionava para match_hub (página que não existe mais)

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

            const file = e.dataTransfer.files[0];
            if (file?.type !== 'application/pdf') {
                alert("Por favor, solte apenas arquivos PDF.");
                return;
            }

            if (view.name === 'update_pdf') {
                workflow.handlePdfUpdate(file);
            } else {
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
    }, [workflow, view.name, isDraggingFile]); // Adicionado isDraggingFile

    useEffect(() => {
        const checkAuthAndInit = async () => {
            try {
                const authData = await loadAuthData();
                if (authData?.token && authData?.user) {
                    setAuthState({ isLoading: false, isAuthenticated: true, user: authData.user, token: authData.token, error: null });
                    setSettings({ isPersistenceEnabled: false, isOpenInTabEnabled: true, isAIEnabled: true });
                    await Promise.all([
                        fetchAndSetJobs(1, 'open'),
                        fetchAllScorecards(),
                        fetchJobFormMetadata()
                    ]);
                    navigateTo('dashboard_jobs');
                } else { setAuthState({ isLoading: false, isAuthenticated: false, user: null, token: null, error: null }); }
            } catch (err) {
                setGlobalError(`Erro ao iniciar: ${err.message}.`);
                setAuthState(prev => ({ ...prev, isLoading: false }));
            } finally { setIsGlobalLoading(false); }
        };
        checkAuthAndInit();
    }, [fetchAllScorecards, fetchAndSetJobs, fetchJobFormMetadata, navigateTo, setSettings]); 

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
        if (newViewName === 'match_hub') navigateTo('match_select_scorecard');
        else navigateTo(newViewName);
    };
    
    // handleConfirmExitMatch e handleCancelExitMatch removidos
    // handleChangeMatchScorecard removido pois era usado na MatchResultView

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
    const viewsWithSidebar = ['dashboard_jobs', 'dashboard_talents', 'settings', 'job_details', 'candidate_details', 'talent_profile', 'scorecard_hub', 'scorecard_edit', 'match_hub', 'match_select_scorecard', 'extracted_text_view', 'update_pdf', 'batch_queue', 'edit_job'];
    const useLayout = viewsWithSidebar.includes(view.name);

    switch (view.name) {
        case 'dashboard_jobs': contentToRender = <JobsDashboardView
            jobsData={jobsData}
            onSelectJob={(job) => workflow.handleSelectJobForDetails(job)} // RESTAURADO: Ir para Job Details (Kanban/List)
            activeStatusFilter={jobStatusFilter}
            onFilterChange={(s) => { setJobStatusFilter(s); fetchAndSetJobs(1, s) }}
            onNavigateToUpload={() => navigateTo('upload_pdf')}
            handleJobsPageChange={handleJobsPageChange}
            onNavigateToCandidates={() => navigateTo('candidate_list')} // Acesso ao Banco Geral
            onCreateJob={() => workflow.handleEditJob(null)} // Novo: Abrir form de criação
            onEditJob={(job) => workflow.handleEditJob(job)} // NOVO: Edição direta da lista
            onSyncJob={workflow.handleSyncJobToInHire} // Novo: Handler de sync
            onDeleteJob={handleDeleteJob}
        />; break;
        case 'talent_profile': contentToRender = <TalentProfileView talent={workflow.currentTalent} onBack={goBack} onEditTalent={workflow.handleEditTalentInfo} onDeleteTalent={workflow.handleDeleteTalent} onAddNewApplication={() => navigateTo('select_job_contextual_for_talent')} onDeleteApplication={workflow.handleRemoveApplicationForTalent} />; break;
        case 'match_select_scorecard': contentToRender = <MatchView 
            scorecards={scorecardTemplates} 
            onBatchSelect={handleSelectMatchScorecard} 
            onGoToHub={() => navigateTo('scorecard_hub')} 
            onViewJob={(job) => {
                workflow.handleSelectJobForDetails(job);
            }}
        />; break;
        case 'dashboard_talents': contentToRender = <TalentsDashboardView talentsData={talentsData} onSelectTalent={workflow.handleSelectTalentForDetails} handleTalentsPageChange={handleTalentsPageChange} filters={filters} onFilterChange={setFilters} isPagingLoading={isPagingLoading} />; break;
        case 'job_details': contentToRender = <JobDetailsView job={workflow.currentJob} candidates={workflow.currentCandidates} onBack={goBack} onUpdateApplicationStatus={workflow.handleUpdateApplicationStatus} onSelectCandidateForDetails={workflow.handleSelectCandidateForDetails} availableStages={workflow.currentJobStages} onEditJob={() => workflow.handleEditJob(workflow.currentJob)} />; break;
        case 'candidate_details': contentToRender = <CandidateDetailView candidate={workflow.currentTalent} job={workflow.currentJob} onBack={goBack} onUpdateStage={workflow.handleUpdateApplicationStatus} stages={workflow.currentJobStages} onGoToEdit={() => navigateTo('edit_candidate')} applicationCustomFields={workflow.applicationCustomFields} interviewKits={workflow.currentInterviewKits} initialState={view.state} scorecardSummary={scorecard.scorecardData?.content} scorecardHooks={scorecard} onUpdateRequest={workflow.handleRequestProfileUpdate} onSaveScorecardAsTemplate={handleSaveScorecardAsTemplate}
            onBatchAnalyse={(url, scorecardId) => {
                // Navega para a fila passando o contexto da vaga atual para o auto-save funcionar
                // Passamos autoStartUrl para o BatchQueueView disparar a busca de forma segura
                navigateTo('batch_queue', { scorecardId, jobId: workflow.currentJob.id, job: workflow.currentJob, isSingleUpdate: true, autoStartUrl: url });
            }}
        />; break;
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
        case 'scorecard_hub': contentToRender = <ScorecardHubView 
            scorecards={filteredScorecards} 
            onAddNew={() => navigateTo('scorecard_edit')} 
            onEdit={(sc) => navigateTo('scorecard_edit', { scorecard: sc })} 
            onDelete={handleDeleteScorecard} 
            onSync={(sc) => {
                executeAsync(async () => {
                    const result = await api.syncScorecardToInHire(sc.id);
                    if (result.success) {
                        if (addToast) addToast('Scorecard sincronizado com sucesso!', 'success');
                        await fetchAllScorecards();
                    } else {
                        if (addToast) addToast(`Erro na sincronização: ${result.error}`, 'error');
                    }
                });
            }}
            onFilterChange={(key, value) => setScorecardFilters(prev => ({ ...prev, [key]: value }))} 
        />; break;
        case 'scorecard_edit': contentToRender = <ScorecardEditView initialData={view.state?.scorecard} onSave={handleSaveScorecard} onCancel={goBack} jobs={jobsData.jobs} />; break;
        case 'match_select_job_pre_queue': contentToRender = <JobsDashboardView
            isSelectionMode={true}
            jobsData={jobsData}
            customTitle="Selecione a Vaga da Fila"
            customSubtitle="Todos os candidatos aceitos irão para esta vaga."
            onSelectJob={async (job) => {
                if (view.state?.mode === 'single_capture') {
                    // DESATIVADO ROBÔ DE BUSCA A PEDIDO DO USUÁRIO - Volta para captura direta da URL
                    const profileUrl = view.state.captureTab.url;

                    navigateTo('batch_queue', {
                        scorecardId: view.state.scorecardId,
                        jobId: job.id,
                        job: job,
                        // Passamos a URL direta para processamento sem busca
                        autoStartDirectUrl: profileUrl
                    });
                } else {
                    // Fluxo de Fila em Lote padrão: detecta todas as abas abertas
                    batchQueue.detectLinkedInTabs().then((tabs) => {
                        navigateTo('batch_queue', {
                            scorecardId: view.state.scorecardId,
                            jobId: job.id,
                            job: job,
                            autoOpenSearch: tabs.length === 0
                        });
                    });
                }
            }}
            onBack={() => navigateTo('match_select_scorecard')}
            handleJobsPageChange={handleJobsPageChange}
            activeStatusFilter={jobStatusFilter}
        />; break;




        // ... lines skipped ...

        case 'batch_queue': contentToRender = <BatchQueueView scorecard={scorecardTemplates.find(sc => sc.id === view.state?.scorecardId)} queueState={batchQueue.queueState} onStartQueue={() => batchQueue.startQueue(view.state?.scorecardId)} onStopQueue={batchQueue.stopQueue} onAcceptProfile={(result) => {
            // Salva no contexto (sempre bom ter)
            workflow.setProfileContext({
                exists: false,
                profileData: result.profileData,
                matchData: {
                    result: result.matchResult,
                    scorecardId: view.state?.scorecardId
                }
            });

            // Se tiver vaga pré-selecionada, salva em SEGUNDO PLANO (Non-Blocking)
            if (view.state?.job) {
                console.log("[DEBUG] Starting background save for:", result.profileData.nome);
                if (!addToast) console.error("[CRITICAL] addToast function is MISSING from context!");

                const toastId = addToast ? addToast(`Salvando ${result.profileData.nome || 'candidato'}...`, 'loading', 0) : null;

                workflow.handleCreateTalentInBackground(
                    {
                        ...result.profileData,
                        linkedinUrl: result.url,
                        linkedinUsername: result.username
                    },
                    view.state.job,
                    {
                        result: result.matchResult,
                        scorecardId: view.state?.scorecardId
                    }
                ).then(() => {
                    console.log("[DEBUG] Save successful");
                    if (addToast) {
                        if (toastId) removeToast(toastId);
                        addToast(`${result.profileData.nome || 'Candidato'} salvo na vaga!`, 'success');
                    }
                }).catch((err) => {
                    console.error("[DEBUG] Save failed:", err);
                    if (addToast) {
                        if (toastId) removeToast(toastId);
                        addToast(`Erro ao salvar: ${err.message}`, 'error');
                    } else {
                        alert(`Erro ao salvar: ${err.message}`);
                    }
                });
            } else {
                console.warn("[DEBUG] No job selected in view state, redirecting to selection or confirmation.");
                if (view.state?.scorecardId) {
                    navigateTo('batch_select_job', { scorecardId: view.state?.scorecardId });
                } else {
                    navigateTo('confirm_profile');
                }
            }
        }} onRejectProfile={(result) => {
            console.log("[DEBUG] Rejecting and auto-saving to bank:", result.profileData.nome);

            const toastId = addToast ? addToast(`Salvando rejeição: ${result.profileData.nome || 'candidato'}...`, 'loading', 0) : null;

            if (view.state?.job) {
                workflow.handleCreateTalentInBackground(
                    {
                        ...result.profileData,
                        status: 'REJECTED',
                        linkedinUrl: result.url,
                        linkedinUsername: result.username
                    },
                    view.state.job,
                    null // No match data needed for rejection, or pass it if we want the score stored
                ).then(() => {
                    if (addToast) {
                        if (toastId) removeToast(toastId);
                        addToast(`${result.profileData.nome} salvo no Banco (Rejeitado)`, 'info');
                    }
                }).catch(err => {
                    console.error("Error saving rejected profile:", err);
                    if (addToast) {
                        if (toastId) removeToast(toastId);
                        addToast(`Erro ao salvar rejeitado: ${err.message}`, 'error');
                    }
                });
            } else {
                console.warn("Cannot save rejected profile: No job context.");
                if (addToast && toastId) removeToast(toastId);
            }
        }} onGoBack={() => navigateTo('match_select_scorecard')}
            onAutoSource={batchQueue.sourceProfilesFromSearch}
            onResetQueue={batchQueue.resetQueue}
            navigationState={view.state}
            onStartDirect={batchQueue.startProcessFromSingleUrl}
        />; break;
        case 'batch_select_job': contentToRender = <JobsDashboardView 
            isSelectionMode={true} 
            jobsData={jobsData} 
            onSelectJob={async (job) => {
                // HERE: Pass matchData to workflow
                await workflow.handleCreateAndGoToEvaluation(
                    workflow.profileContext.profileData,
                    job,
                    workflow.profileContext.matchData // New Argument
                );
                navigateTo('batch_queue', { scorecardId: view.state?.scorecardId });
            }} 
            onBack={() => navigateTo('batch_queue', { scorecardId: view.state?.scorecardId })} 
            handleJobsPageChange={handleJobsPageChange} 
            activeStatusFilter={jobStatusFilter}
            onDeleteJob={handleDeleteJob}
        />; break;
        // NOVA ROTA: Lista de Candidatos (Local-First)
        case 'candidate_list': contentToRender = <CandidateListView
            jobId={view.state?.jobId} // <-- PASSANDO O JOB ID
            onSelectCandidate={(talent) => workflow.handleSelectTalentForDetails(talent)}
            onBack={() => navigateTo('dashboard_jobs')}
            // NOVOS HANDLERS
            onAddFromBank={() => navigateTo('select_talent_for_job', { jobId: view.state?.jobId })}
            onAddFromMatch={() => {
                navigateTo('match_select_scorecard');
            }}
            onReconsider={(talent) => {
                workflow.setCurrentTalent(talent);
                navigateTo('select_job_contextual_for_talent');
            }}
        />; break;

        case 'edit_job': contentToRender = <EditJobView 
            job={workflow.currentJob} 
            onSave={async (id, data) => {
                const toastId = addToast ? addToast('Salvando vaga...', 'loading', 0) : null;
                try {
                    if (id) {
                        await api.updateJobDetails(id, data);
                    } else {
                        await api.createJob(data);
                    }
                    if (addToast && toastId) removeToast(toastId);
                    if (addToast) addToast('Vaga salva com sucesso!', 'success');
                    fetchAndSetJobs(1, jobStatusFilter); // Refresh list
                    goBack();
                } catch (err) {
                    if (addToast && toastId) removeToast(toastId);
                    if (addToast) addToast(`Erro ao salvar: ${err.message}`, 'error');
                }
            }} 
            onCancel={goBack}
            jobCustomFields={jobCustomFields} 
            areas={availableAreas} 
            scorecards={scorecardTemplates}
        />; break;

        // NOVA ROTA: Selecionar Talento para Vaga (Inverso de Vaga para Talento)
        case 'select_talent_for_job': contentToRender = <TalentsDashboardView
            isSelectionMode={true}
            talentsData={talentsData}
            onSelectTalent={async (talent) => {
                if (view.state?.jobId) {
                    await workflow.handleApplyTalentToJob(view.state.jobId, talent.id);
                    goBack(); // Volta para a lista de candidatos
                }
            }}
            onCancel={goBack}
            handleTalentsPageChange={handleTalentsPageChange}
            filters={filters}
            onFilterChange={setFilters}
            isPagingLoading={isPagingLoading}
        />; break;

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
                    onOpenInTab={settings?.isOpenInTabEnabled ? () => { if (window.chrome && chrome.runtime) { window.open(chrome.runtime.getURL('index.html')); window.close(); } } : null}
                    onCaptureProfile={handleCaptureProfileVisual}
                    onLogout={handleLogout}

                >
                    <ProfileStatusNotification
                        status={validationResult}
                        onGoToProfile={workflow.handleSelectTalentForDetails}
                    />
                    {contentToRender}
                </Layout>
            ) : contentToRender}



            {isDraggingFile && <div className={styles.dragOverlay}>Solte o PDF aqui</div>}
        </div>
    );
};

export default Popup;