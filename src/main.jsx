import React from 'react';
import ReactDOM from 'react-dom/client';
import Popup from './popup/Popup';
import './index.css';

import { ToastProvider } from './contexts/ToastContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <Popup />
    </ToastProvider>
  </React.StrictMode>,
);