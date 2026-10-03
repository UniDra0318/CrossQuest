import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import RecordsView from './components/RecordsView';
import AnomaliesView from './components/AnomaliesView';
import ReportsView from './components/ReportsView';
import TraineePortal from './components/TraineePortal';
import InstallPwaModal from './components/InstallPwaModal';
import { 
  INITIAL_STAFF_PROFILES, 
  CLIENT_COMPANIES, 
  INITIAL_TRAINING_RECORDS, 
  INITIAL_ANOMALIES 
} from './data/mockData';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('records');
  const [currentStaff, setCurrentStaff] = useState(INITIAL_STAFF_PROFILES[0]);
  const [records, setRecords] = useState(INITIAL_TRAINING_RECORDS);
  const [anomalies, setAnomalies] = useState(INITIAL_ANOMALIES);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // When an unauthorized attempt occurs in RecordsView, automatically log an anomaly
  const handleAttemptAccess = (record, authorized) => {
    if (!authorized) {
      const newAlert = {
        id: `alert-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        type: 'OUT_OF_SCOPE',
        severity: 'HIGH',
        userEmail: currentStaff.email,
        userName: currentStaff.name,
        description: `Unauthorized decryption attempt on record #${record.id} (${record.companyName}) by staff without matching company attribute.`,
        targetRecord: `${record.id} (${record.traineeName})`,
        status: 'UNREVIEWED'
      };
      setAnomalies(prev => [newAlert, ...prev]);
    }
  };

  const unreadAnomaliesCount = anomalies.filter(a => a.status === 'UNREVIEWED').length;

  return (
    <div className="crossquest-app-root">
      {/* Clean, Focused Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentStaff={currentStaff}
        setCurrentStaff={setCurrentStaff}
        staffProfiles={INITIAL_STAFF_PROFILES}
        isOnline={isOnline}
        unreadAnomaliesCount={unreadAnomaliesCount}
      />

      {/* Main Single-Focused View */}
      <main className="content-container">
        {activeTab === 'records' && (
          <RecordsView
            records={records}
            currentStaff={currentStaff}
            clientCompanies={CLIENT_COMPANIES}
            onAttemptAccess={handleAttemptAccess}
          />
        )}

        {activeTab === 'anomalies' && (
          <AnomaliesView
            anomalies={anomalies}
            setAnomalies={setAnomalies}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            clientCompanies={CLIENT_COMPANIES}
            records={records}
            currentStaff={currentStaff}
          />
        )}

        {activeTab === 'trainee' && (
          <TraineePortal />
        )}
      </main>

      {/* PWA Install Banner */}
      <InstallPwaModal />

      {/* Subtle, Minimal Footer */}
      <footer className="system-footer">
        <div className="footer-content">
          <div className="footer-left">
            <span className="footer-title">CrossQuest Security Management Platform</span>
            <span className="footer-sub">
              ISO/IEC 27001:2022 • CP-ABE (Charm-Crypto Waters11) • PostgreSQL Row-Level Security
            </span>
          </div>
          <div className="footer-tags">
            <span className="badge badge-gray">Crossworks Capstone</span>
            <span className="badge badge-gray">University of Makati</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
