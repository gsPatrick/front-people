// src/hooks/useChat.js
// Hook para gerenciar o chat com a Ana Issidoro
// Suporta streaming SSE (Server-Sent Events)

import { useState, useCallback, useRef, useEffect } from 'react';
import { loadAuthData } from '../services/session.service';

const API_BASE_URL = 'https://geral-people-api.r954jc.easypanel.host/api';

export const useChat = () => {
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [models, setModels] = useState([]); // Novo
    const [selectedModelId, setSelectedModelId] = useState(null); // Novo
    const [suggestions, setSuggestions] = useState([
        "📊 Quantas vagas temos abertas?",
        "👥 Liste os últimos candidatos",
        "🔍 Buscar candidatos com score alto",
        "📋 Quais scorecards temos?"
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const abortControllerRef = useRef(null);

    // Carregar lista de conversas
    const loadConversations = useCallback(async () => {
        try {
            const authData = await loadAuthData();
            const res = await fetch(`${API_BASE_URL}/chat/conversations`, {
                headers: {
                    'Authorization': `Bearer ${authData?.token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await res.json();
            if (data.success) {
                setConversations(data.conversations || []);
            }
        } catch (err) {
            console.error('[CHAT] Erro ao carregar conversas:', err);
        }
    }, []);

    // Carregar histórico de uma conversa
    const loadConversation = useCallback(async (conversationId) => {
        try {
            const authData = await loadAuthData();
            const res = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}`, {
                headers: {
                    'Authorization': `Bearer ${authData?.token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await res.json();
            if (data.success) {
                setActiveConversation(data.conversation);
                setMessages(data.conversation.messages || []);
            }
        } catch (err) {
            console.error('[CHAT] Erro ao carregar conversa:', err);
        }
    }, []);

    // Enviar mensagem com streaming SSE
    const sendMessage = useCallback(async (message) => {
        if (!message.trim() || isStreaming) return;

        // Adicionar mensagem do usuário imediatamente
        const userMsg = { id: Date.now(), role: 'user', content: message, createdAt: new Date().toISOString() };
        setMessages(prev => [...prev, userMsg]);
        setIsStreaming(true);
        setStreamingContent('');

        // Placeholder do assistant
        const assistantMsgId = Date.now() + 1;

        try {
            const authData = await loadAuthData();

            // Usar fetch para SSE (axios não suporta streaming)
            const response = await fetch(`${API_BASE_URL}/chat/message`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authData?.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    conversationId: activeConversation?.id || null,
                    message: message,
                    modelId: selectedModelId // Envia o modelo selecionado
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Mantém linha incompleta no buffer

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            if (data.type === 'conversationId') {
                                // Se for uma nova conversa, atualizar o activeConversation
                                const convId = data.conversationId;
                                setActiveConversation(prev => {
                                    if (!prev || prev.id !== convId) {
                                        return { id: convId };
                                    }
                                    return prev;
                                });
                            } else if (data.type === 'delta') {
                                fullContent += data.content;
                                setStreamingContent(fullContent);
                            } else if (data.type === 'done') {
                                fullContent = data.fullContent || fullContent;
                            } else if (data.type === 'error') {
                                console.error('[CHAT] Erro no stream:', data.error);
                            }
                        } catch (parseErr) {
                            // Ignora linhas inválidas
                        }
                    }
                }
            }

            // Finalizar: adicionar mensagem do assistant
            const assistantMsg = {
                id: assistantMsgId,
                role: 'assistant',
                content: fullContent,
                createdAt: new Date().toISOString()
            };
            setMessages(prev => [...prev, assistantMsg]);
            setStreamingContent('');

            // Se não tinha conversa ativa, recarregar a lista
            if (!activeConversation) {
                await loadConversations();
            }

        } catch (err) {
            console.error('[CHAT] Erro ao enviar mensagem:', err);
            const errorMsg = {
                id: assistantMsgId,
                role: 'assistant',
                content: '❌ Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
                createdAt: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsStreaming(false);
            setStreamingContent('');
        }
    }, [activeConversation, isStreaming, loadConversations]);

    // Criar nova conversa
    const newConversation = useCallback(() => {
        setActiveConversation(null);
        setMessages([]);
        setStreamingContent('');
    }, []);

    // Deletar conversa
    const deleteConversation = useCallback(async (conversationId) => {
        try {
            const authData = await loadAuthData();
            await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authData?.token}` }
            });
            setConversations(prev => prev.filter(c => c.id !== conversationId));
            if (activeConversation?.id === conversationId) {
                newConversation();
            }
        } catch (err) {
            console.error('[CHAT] Erro ao deletar conversa:', err);
        }
    }, [activeConversation, newConversation]);

    // Carregar configurações (sugestões)
    const loadSettings = useCallback(async () => {
        try {
            const authData = await loadAuthData();
            const res = await fetch(`${API_BASE_URL}/chat/settings`, {
                headers: {
                    'Authorization': `Bearer ${authData?.token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await res.json();
            if (data.success && data.settings?.suggestions) {
                setSuggestions(data.settings.suggestions);
            }
        } catch (err) {
            console.error('[CHAT] Erro ao carregar configurações:', err);
        }
    }, []);

    // Atualizar configurações (sugestões)
    const updateSuggestions = useCallback(async (newSuggestions) => {
        try {
            const authData = await loadAuthData();
            const res = await fetch(`${API_BASE_URL}/chat/settings`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authData?.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ suggestions: newSuggestions })
            });
            const data = await res.json();
            if (data.success) {
                setSuggestions(data.settings.suggestions);
                return { success: true };
            }
            return { success: false, error: data.error };
        } catch (err) {
            console.error('[CHAT] Erro ao atualizar configurações:', err);
            return { success: false, error: err.message };
        }
    }, []);

    // Carregar modelos disponíveis
    const loadAvailableModels = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/ana/models`, {
                headers: { 'Authorization': `Bearer ${loadAuthData()?.token}` }
            });
            const data = await res.json();
            if (data.success) setModels(data.models);
        } catch (err) {
            console.error('Erro ao buscar modelos:', err);
        }
    }, []);

    useEffect(() => {
        loadAvailableModels();
    }, [loadAvailableModels]);

    // Carregar conversas e settings ao montar
    useEffect(() => {
        loadConversations();
        loadSettings();
    }, [loadConversations, loadSettings]);

    return {
        conversations,
        activeConversation,
        messages,
        suggestions, // Expondo sugestões dinâmicas
        isLoading,
        isStreaming,
        streamingContent,
        sendMessage,
        loadConversation,
        loadConversations,
        newConversation,
        deleteConversation,
        loadSettings,
        updateSuggestions,
        models, // Exportar
        selectedModelId, // Exportar
        setSelectedModelId // Exportar
    };
};
