import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import './App.css';

import ProductionCalendar from './components/ProductionCalendar';
import MpsSchedule from './components/MpsSchedule';
import HomePage from './components/HomePage';
import Header from './components/Header';
import SegmentFolioCuts from './components/SegmentFolioCuts';

function App() {
  const { t } = useTranslation();
  const [dbStatus, setDbStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to check database connectivity
  const testSimpleQuery = async () => {
    try {
      console.log('Checking database connectivity...');
      const startTime = Date.now();
      
      // Try the API status endpoint first
      const { data } = await axios.get('/api/status');
      const clientTime = Date.now() - startTime;
      
      console.log(`Database connectivity check: ${data.status} (${clientTime}ms)`);
      
      if (data.status === 'ok' && data.database === 'connected') {
        // Also test the production-specific endpoint
        try {
          const prodStatus = await axios.get('/api/production/status');
          console.log(`Production database check: ${prodStatus.data.status} (query time: ${prodStatus.data.query_time_ms}ms)`);
          console.log(`Database returned ${prodStatus.data.rows_returned} sample records`);
          return true;
        } catch (prodErr) {
          console.error('Production database check failed:', prodErr);
          return false;
        }
      }
      
      return data.status === 'ok';
    } catch (err) {
      console.error('Database connectivity check failed:', err);
      return false;
    }
  };

  useEffect(() => {
    const checkDbStatus = async () => {
      // Just check database connectivity with a lightweight query
      const simpleQueryResult = await testSimpleQuery();

      if (!simpleQueryResult) {
        setError(t('app.error'));
        setDbStatus(false);
      } else {
        setDbStatus(true);
      }

      setLoading(false);
    };

    checkDbStatus();
  }, [t]);

  if (loading) return (
    <div className="loading-container">
      <div className="loader"></div>
      <p>{t('app.loading')}</p>
    </div>
  );

  if (error) return (
    <div className="error-container">
      <div className="error-message">{error}</div>
      <p>{t('app.errorPersist')}</p>
      <p className="error-hint">{t('app.lastAttempt')} {new Date().toLocaleString()}</p>
    </div>
  );

  return (
    <Router>
      <div className="app">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/calendar" element={<ProductionCalendar />} />
            <Route path="/mps" element={<MpsSchedule dbConnected={dbStatus} />} />
            <Route path="/sfc" element={<SegmentFolioCuts />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App
