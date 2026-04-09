/* global chrome */
// batch_progress_widget.js — Content script injetado em abas do usuário para mostrar progresso do batch

(function() {
    const WIDGET_ID = '__anna_batch_progress_widget__';

    function createWidget() {
        if (document.getElementById(WIDGET_ID)) return;

        const widget = document.createElement('div');
        widget.id = WIDGET_ID;
        widget.style.cssText = `
            position: fixed;
            top: 16px;
            right: 16px;
            z-index: 2147483647;
            background: rgba(15, 23, 42, 0.88);
            backdrop-filter: blur(8px);
            color: #e2e8f0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 13px;
            padding: 8px 14px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.08);
            pointer-events: none;
            transition: opacity 0.3s ease;
        `;

        const icon = document.createElement('span');
        icon.textContent = '🤖';
        icon.style.fontSize = '15px';

        const text = document.createElement('span');
        text.id = WIDGET_ID + '_text';
        text.style.cssText = 'font-weight: 500; letter-spacing: 0.5px;';
        text.textContent = '0/0';

        widget.appendChild(icon);
        widget.appendChild(text);
        document.body.appendChild(widget);
    }

    function updateWidget(current, total) {
        createWidget();
        const text = document.getElementById(WIDGET_ID + '_text');
        if (text) text.textContent = `${current}/${total}`;
    }

    function removeWidget() {
        const widget = document.getElementById(WIDGET_ID);
        if (widget) {
            widget.style.opacity = '0';
            setTimeout(() => widget.remove(), 300);
        }
    }

    // Listener para mensagens do background
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'BATCH_WIDGET_UPDATE') {
            updateWidget(message.current, message.total);
        } else if (message.type === 'BATCH_WIDGET_HIDE') {
            removeWidget();
        }
    });
})();
