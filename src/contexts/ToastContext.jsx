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
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                pointerEvents: 'none' // Clicks passing through if not on toast
            }}>
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        style={{
                            background: '#1e293b',
                            color: 'white',
                            padding: '10px 16px',
                            borderRadius: '30px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '13px',
                            fontWeight: '500',
                            animation: 'slideDown 0.3s ease-out',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            pointerEvents: 'auto',
                            minWidth: '200px',
                            justifyContent: 'center'
                        }}
                    >
                        {toast.type === 'success' && '✅'}
                        {toast.type === 'error' && '❌'}
                        {toast.type === 'loading' && '⏳'}
                        {toast.message}
                    </div>
                ))}
            </div>
            <style>{`
                @keyframes slideDown {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </ToastContext.Provider>
    );
};

export const useToast = () => useContext(ToastContext);
