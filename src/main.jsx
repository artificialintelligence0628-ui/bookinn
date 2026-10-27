import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ServerStatus from './ServerStatus.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ServerStatus />
    <App />
  </React.StrictMode>,
)
