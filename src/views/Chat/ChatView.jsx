// src/views/Chat/ChatView.jsx
// Chat completo com a Ana Issidoro — streaming SSE + UI estilo ChatGPT

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '../../hooks/useChat';
import styles from './ChatView.module.css';
import { BsArrowLeft, BsChatDots, BsPlus, BsTrash, BsSend, BsBook } from 'react-icons/bs';

// Simples parser de markdown para renderização básica
const renderMarkdown = (text) => {
    if (!text) return '';
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
        .replace(/\n/g, '<br/>');
};

const ChatView = ({ onBack }) => {
    const {
        conversations,
        activeConversation,
        messages,
        suggestions, // Sugestões vindas da API
        isStreaming,
        streamingContent,
        sendMessage,
        loadConversation,
        newConversation,
        deleteConversation,
        models,
        selectedModelId,
        setSelectedModelId
    } = useChat();

    const [inputValue, setInputValue] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const [showModelMenu, setShowModelMenu] = useState(false);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    // Auto-scroll para o final das mensagens
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingContent]);

    // Auto-focus no input
    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    // Auto-resize textarea
    const handleInputChange = (e) => {
        setInputValue(e.target.value);
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        }
    };

    // Enviar mensagem
    const handleSend = useCallback(() => {
        if (inputValue.trim() && !isStreaming) {
            sendMessage(inputValue.trim());
            setInputValue('');
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    }, [inputValue, isStreaming, sendMessage]);

    // Enter para enviar, Shift+Enter para nova linha
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Usar sugestão
    const handleSuggestion = (suggestion) => {
        sendMessage(suggestion);
    };

    // Formatar data
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        if (diff < 86400000) return 'Hoje';
        if (diff < 172800000) return 'Ontem';
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    };

    const hasMessages = messages.length > 0 || isStreaming;

    return (
        <div className={styles.chatContainer}>
            {/* HEADER */}
            <div className={styles.chatHeader}>
                <button className={styles.backBtn} onClick={onBack} title="Voltar">
                    <BsArrowLeft />
                </button>
                <div className={styles.headerInfo}>
                    <p className={styles.headerTitle}>Ana Issidoro</p>
                    <div className={styles.toolSelectorWrapper}>
                        <button 
                            className={styles.toolTrigger} 
                            onClick={() => setShowModelMenu(!showModelMenu)}
                        >
                            <BsBook className={styles.toolIcon} />
                            <span>{selectedModelId ? models.find(m => m.id === selectedModelId)?.name : 'Modelo Padrão'}</span>
                            <BsPlus style={{ transform: showModelMenu ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }} />
                        </button>

                        {showModelMenu && (
                            <>
                                <div className={styles.toolMenuOverlay} onClick={() => setShowModelMenu(false)} />
                                <div className={styles.toolMenu}>
                                    <div 
                                        className={`${styles.toolOption} ${!selectedModelId ? styles.activeTool : ''}`}
                                        onClick={() => { setSelectedModelId(null); setShowModelMenu(false); }}
                                    >
                                        <span className={styles.toolEmoji}>🎯</span>
                                        <div className={styles.toolInfo}>
                                            <p className={styles.toolName}>Modelo Padrão</p>
                                            <p className={styles.toolDesc}>Especialista Geral People AI</p>
                                        </div>
                                    </div>
                                    {models.map(m => (
                                        <div 
                                            key={m.id} 
                                            className={`${styles.toolOption} ${selectedModelId === m.id ? styles.activeTool : ''}`}
                                            onClick={() => { setSelectedModelId(m.id); setShowModelMenu(false); }}
                                        >
                                            <span className={styles.toolEmoji}>🧠</span>
                                            <div className={styles.toolInfo}>
                                                <p className={styles.toolName}>{m.name}</p>
                                                <p className={styles.toolDesc}>Conhecimento Mestre</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <div className={styles.headerActions}>
                    <button
                        className={styles.headerBtn}
                        onClick={() => setShowHistory(!showHistory)}
                        title="Histórico"
                    >
                        <BsChatDots />
                    </button>
                    <button
                        className={styles.headerBtn}
                        onClick={newConversation}
                        title="Nova conversa"
                    >
                        <BsPlus />
                    </button>
                </div>
            </div>

            {/* CONVERSATION HISTORY DROPDOWN */}
            {showHistory && (
                <div className={styles.convList}>
                    {conversations.length === 0 ? (
                        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                            Nenhuma conversa anterior
                        </div>
                    ) : conversations.map(conv => (
                        <div
                            key={conv.id}
                            className={styles.convItem}
                            onClick={() => { loadConversation(conv.id); setShowHistory(false); }}
                        >
                            <BsChatDots style={{ flexShrink: 0, opacity: 0.5 }} />
                            <span className={styles.convTitle}>{conv.title}</span>
                            <span className={styles.convDate}>{formatDate(conv.updatedAt)}</span>
                            <button
                                className={styles.convDeleteBtn}
                                onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                                title="Deletar conversa"
                            >
                                <BsTrash />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* MESSAGES AREA */}
            <div className={styles.messagesArea}>
                {!hasMessages ? (
                    /* WELCOME SCREEN */
                    <div className={styles.welcomeScreen}>
                        <div className={styles.welcomeVideoWrapper}>
                            <video
                                className={styles.welcomeVideo}
                                src="/assets/ana-avatar.mp4"
                                muted
                                loop
                                autoPlay
                                playsInline
                            />
                        </div>
                        <h2 className={styles.welcomeTitle}>Olá! Eu sou a Ana 👋</h2>
                        <p className={styles.welcomeSubtitle}>
                            Sou a CTO da People AI. Tenho acesso a todas as vagas, candidatos e dados do sistema. Como posso ajudar?
                        </p>
                        <div className={styles.suggestions}>
                            {suggestions.map((s, i) => (
                                <button
                                    key={i}
                                    className={styles.suggestionChip}
                                    onClick={() => handleSuggestion(s)}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* MESSAGE LIST */
                    <>
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`${styles.messageBubble} ${msg.role === 'user' ? styles.userBubble : styles.assistantBubble}`}
                            >
                                {msg.role === 'assistant' ? (
                                    <div className={styles.messageAvatarWrapper}>
                                         <img src="/logo.png" alt="Ana" className={styles.messageAvatar} />
                                    </div>
                                ) : (
                                    <div className={`${styles.messageAvatar} ${styles.userAvatar}`}>
                                        U
                                    </div>
                                )}
                                <div className={`${styles.messageContent} ${msg.role === 'user' ? styles.userContent : styles.assistantContent}`}>
                                    {msg.role === 'assistant' ? (
                                        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                                    ) : (
                                        msg.content
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* STREAMING MESSAGE */}
                        {isStreaming && (
                            <div className={`${styles.messageBubble} ${styles.assistantBubble}`}>
                                <div className={styles.messageAvatarWrapper}>
                                     <img src="/logo.png" alt="Ana" className={styles.messageAvatar} />
                                </div>
                                <div className={`${styles.messageContent} ${styles.assistantContent}`}>
                                    {streamingContent ? (
                                        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingContent) }} />
                                    ) : (
                                        <div className={styles.streamingIndicator}>
                                            <span className={styles.streamingDot}></span>
                                            <span className={styles.streamingDot}></span>
                                            <span className={styles.streamingDot}></span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* INPUT AREA */}
            <div className={styles.inputArea}>
                <div className={styles.inputWrapper}>
                    <textarea
                        ref={textareaRef}
                        className={styles.chatInput}
                        placeholder="Pergunte algo para a Ana..."
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        disabled={isStreaming}
                    />
                    <button
                        className={styles.sendBtn}
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isStreaming}
                        title="Enviar"
                    >
                        <BsSend />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatView;
