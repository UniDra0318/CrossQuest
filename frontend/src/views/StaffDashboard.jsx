import React from 'react';
import { StaffProvider } from '../staff/StaffContext';
import StaffLayout from '../staff/StaffLayout';
import RecordVault from '../staff/pages/RecordVault';
import Portfolios from '../staff/pages/Portfolios';
import Reports from '../staff/pages/Reports';

export default function StaffDashboard({ activeSubView, setActiveView }) {
  const currentTab = 
    activeSubView === 'assigned_clients' || activeSubView === 'portfolios' 
      ? 'portfolios' 
      : activeSubView === 'compliance_reports' || activeSubView === 'reports' 
        ? 'reports' 
        : 'records';

  const handleTabChange = (tabId) => {
    if (!setActiveView) return;
    if (tabId === 'portfolios') setActiveView('assigned_clients');
    else if (tabId === 'reports') setActiveView('compliance_reports');
    else setActiveView('staff_records');
  };

  return (
    <StaffProvider>
      <StaffLayout activeTab={currentTab} onTabChange={handleTabChange}>
        {currentTab === 'portfolios' && <Portfolios />}
        {currentTab === 'reports' && <Reports />}
        {currentTab === 'records' && <RecordVault />}
      </StaffLayout>
    </StaffProvider>
  );
}
