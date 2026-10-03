import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SecurityDashboard from './components/SecurityDashboard';
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
  const [activeTab, setActiveTab] = useState('staff');
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

  return (
    <div className="crossquest-app-root">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentStaff={currentStaff}
        setCurrentStaff={setCurrentStaff}
        staffProfiles={INITIAL_STAFF_PROFILES}
        isOnline={isOnline}
      />

      {/* Main Content Area */}
      <main className="content-container">
        {activeTab === 'staff' ? (
          <SecurityDashboard
            records={records}
            currentStaff={currentStaff}
            anomalies={anomalies}
            setAnomalies={setAnomalies}
            clientCompanies={CLIENT_COMPANIES}
          />
        ) : (
          <TraineePortal />
        )}
      </main>

      {/* PWA Install Banner */}
      <InstallPwaModal />

      {/* System Footer */}
      <footer className="system-footer">
        <div className="footer-content">
          <div className="footer-left">
            <span className="footer-title">CrossQuest Security Platform</span>
            <span className="footer-sub">
              Ciphertext-Policy Attribute-Based Encryption (CP-ABE) & Access Anomaly Detection
            </span>
          </div>
          <div className="footer-tags">
            <span className="badge badge-purple">ISO/IEC 27001:2022</span>
            <span className="badge badge-cyan">ISO/IEC 27701</span>
            <span className="badge badge-emerald">PostgreSQL RLS</span>
            <span className="badge badge-rose">Charm-Crypto Waters11</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
