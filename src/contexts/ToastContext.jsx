import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'success', duration = 4000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);

        if (duration) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast, removeToast }}>
            {children}
            <div style={{
                position: 'fixed',
                bottom: '40px', // Moved to bottom for better visibility
                // top: '80px', // REMOVED
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 2147483647, // Max Z-Index
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                pointerEvents: 'none',
                width: 'auto',
                maxWidth: '90%'
            }}>
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        style={{
                            background: '#0f172a', // Darker background
                            color: '#f8fafc',
                            padding: '12px 20px',
                            borderRadius: '50px', // Pill shape (Island)
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)', // Stronger shadow
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            fontSize: '14px',
                            fontWeight: '600',
                            animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)', // Smooth dynamic island animation
                            border: '1px solid rgba(255,255,255,0.1)',
                            pointerEvents: 'auto',
                            minWidth: '220px',
                            justifyContent: 'center',
                            textAlign: 'center'
                        }}
                    >
                        {toast.type === 'success' && <span style={{ fontSize: '1.2em' }}>✅</span>}
                        {toast.type === 'error' && <span style={{ fontSize: '1.2em' }}>❌</span>}
                        {toast.type === 'loading' && <span className="toast-spinner">⏳</span>}
                        <span>{toast.message}</span>
                    </div>
                ))}
            </div>
            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(50px) scale(0.9); opacity: 0; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }
                .toast-spinner {
                    animation: spin 1s linear infinite;
                    display: inline-block;
                }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </ToastContext.Provider>
    );
};

export const useToast = () => useContext(ToastContext);
