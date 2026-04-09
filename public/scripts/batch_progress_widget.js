/* global chrome */
// batch_progress_widget.js — Content script premium injetado em abas do usuário

(function() {
    const WIDGET_ID = '__anna_batch_progress_widget__';

    function createWidget() {
        if (document.getElementById(WIDGET_ID)) return;

        const widget = document.createElement('div');
        widget.id = WIDGET_ID;
        widget.classList.add('hidden'); // Começa escondido
        
        const style = document.createElement('style');
        style.textContent = `
            #${WIDGET_ID} {
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 2147483647;
                background: rgba(15, 23, 42, 0.85);
                backdrop-filter: blur(12px) saturate(180%);
                -webkit-backdrop-filter: blur(12px) saturate(180%);
                color: #f8fafc;
                font-family: 'Inter', -apple-system, system-ui, sans-serif;
                padding: 12px 20px;
                border-radius: 16px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
                border: 1px solid rgba(255, 255, 255, 0.1);
                min-width: 200px;
                pointer-events: auto;
                transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease;
                user-select: none;
                cursor: default;
            }

            #${WIDGET_ID}.hidden {
                transform: translateY(100px) scale(0.8);
                opacity: 0;
            }

            .anna-widget-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                width: 100%;
            }

            .anna-widget-title {
                font-size: 11px;
                font-weight: 600;
                color: #94a3b8;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                display: flex;
                align-items: center;
            }

            .anna-widget-counter {
                font-size: 14px;
                font-weight: 700;
                color: #38bdf8;
                font-variant-numeric: tabular-nums;
            }

            .anna-widget-progress-container {
                width: 100%;
                height: 6px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 999px;
                overflow: hidden;
            }

            .anna-widget-progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #0ea5e9, #6366f1);
                width: 0%;
                border-radius: 999px;
                transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .anna-widget-pulse {
                width: 8px;
                height: 8px;
                background: #38bdf8;
                border-radius: 50%;
                display: inline-block;
                margin-right: 8px;
                animation: anna-pulse 2s infinite;
            }

            @keyframes anna-pulse {
                0% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.7); }
                70% { box-shadow: 0 0 0 8px rgba(56, 189, 248, 0); }
                100% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0); }
            }
        `;
        document.head.appendChild(style);

        widget.innerHTML = `
            <div class="anna-widget-header">
                <span class="anna-widget-title"><span class="anna-widget-pulse"></span>Capture Ativa</span>
                <span class="anna-widget-counter" id="${WIDGET_ID}_text">0/0</span>
            </div>
            <div class="anna-widget-progress-container">
                <div class="anna-widget-progress-bar" id="${WIDGET_ID}_bar"></div>
            </div>
        `;

        document.body.appendChild(widget);
    }

    function updateWidget(current, total) {
        createWidget();
        const widget = document.getElementById(WIDGET_ID);
        const text = document.getElementById(WIDGET_ID + '_text');
        const bar = document.getElementById(WIDGET_ID + '_bar');
        
        if (widget) widget.classList.remove('hidden');
        if (text) text.textContent = `${current}/${total}`;
        if (bar) {
            const percentage = Math.min(100, (current / total) * 100);
            bar.style.width = `${percentage}%`;
        }
    }

    function removeWidget() {
        const widget = document.getElementById(WIDGET_ID);
        if (widget) {
            widget.classList.add('hidden');
            setTimeout(() => widget.remove(), 500);
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

    // AUTO-INITIALIZATION: Verifica se já existe um batch rodando ao carregar a página
    chrome.storage.local.get('batch_state', (data) => {
        if (data?.batch_state?.isRunning) {
            const current = data.batch_state.results.length;
            const total = data.batch_state.tabs.length;
            updateWidget(current, total);
        }
    });
})();
