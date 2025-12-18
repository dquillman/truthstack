import React from 'react';
import ReactDOM from 'react-dom/client';
import AdminApp from './AdminApp';
import '../../index.css'; // Reuse main styles or create new ones

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <AdminApp />
    </React.StrictMode>,
);
