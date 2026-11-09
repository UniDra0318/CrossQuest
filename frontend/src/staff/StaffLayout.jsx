import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import '../styles/admin.css';
import './staff.css';

/**
 * StaffLayout - clean layout for Account Managers.
 * Conforms to UI/UX Improvement Plan:
 * - Replaces 280px hero banner with slim PageHeader
 * - Removes 3D cube and floating tags
 * - Navigation handled by persistent sidebar
 */
export default function StaffLayout({ activeTab, children }) {
  const { currentUser } = useAuth();

  const assignedScope = currentUser?.assigned_client_accounts?.join(', ') || 
    currentUser?.assigned_companies?.join(', ') || '';

  const renderHeader = () => {
    switch (activeTab) {
      case 'sessions':
        return (
          <PageHeader
            title="Sessions"
            subtitle="Training cohort scheduling, participant attendance tracking, and trainer hand-off. Click any active session to edit."
            badge={assignedScope ? `CLIENTS: ${assignedScope}` : 'ACTIVE SESSIONS'}
            badgeType="success"
          />
        );
      case 'portfolios':
        return (
          <PageHeader
            title="Clients"
            subtitle="Assigned enterprise client accounts and workforce training contracts."
            badge="PORTFOLIO"
            badgeType="info"
          />
        );
      case 'reports':
        return (
          <PageHeader
            title="Reports"
            subtitle="Training completion audits, attendance summaries, and certification status."
            badge="COMPLIANCE"
            badgeType="default"
          />
        );
      case 'records':
      default:
        return (
          <PageHeader
            title="Training Records"
            subtitle="Encrypted training records within your authorized client scope."
            badge={assignedScope ? `SCOPE: ${assignedScope}` : 'VAULT RECORDS'}
            badgeType="success"
          />
        );
    }
  };

  return (
    <div className="adm-main staff-dashboard">
      {renderHeader()}

      {/* Page Content */}
      <div>
        {children}
      </div>
    </div>
  );
}
