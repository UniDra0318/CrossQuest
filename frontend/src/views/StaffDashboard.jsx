import React from 'react';
import { StaffProvider } from '../staff/StaffContext';
import StaffLayout from '../staff/StaffLayout';
import Sessions from '../staff/pages/Sessions';
import RecordVault from '../staff/pages/RecordVault';
import Portfolios from '../staff/pages/Portfolios';
import Reports from '../staff/pages/Reports';

export default function StaffDashboard({ activeSubView, setActiveView }) {
  const currentTab = 
    activeSubView === 'assigned_clients' || activeSubView === 'portfolios' 
      ? 'portfolios' 
      : activeSubView === 'compliance_reports' || activeSubView === 'reports' 
        ? 'reports' 
        : activeSubView === 'records_vault' || activeSubView === 'staff_records' || activeSubView === 'records'
          ? 'records'
          : 'sessions';

  const handleTabChange = (tabId) => {
    if (!setActiveView) return;
    if (tabId === 'portfolios') setActiveView('assigned_clients');
    else if (tabId === 'reports') setActiveView('compliance_reports');
    else if (tabId === 'records') setActiveView('records_vault');
    else setActiveView('am_sessions');
  };

  return (
    <StaffProvider>
      <StaffLayout activeTab={currentTab} onTabChange={handleTabChange}>
        {currentTab === 'sessions' && <Sessions />}
        {currentTab === 'portfolios' && <Portfolios />}
        {currentTab === 'reports' && <Reports />}
        {currentTab === 'records' && <RecordVault />}
      </StaffLayout>
    </StaffProvider>
  );
}
