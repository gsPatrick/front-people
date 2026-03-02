// src/sidepanel.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import Popup from './popup/Popup'; // Reutilizamos nosso componente principal!
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
);