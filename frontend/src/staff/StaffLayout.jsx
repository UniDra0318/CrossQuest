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
export default function StaffLayout({ activeTab, onTabChange, children }) {
  const { currentUser } = useAuth();

  const assignedScope = currentUser?.assigned_client_accounts?.join(', ') || 
    currentUser?.assigned_companies?.join(', ') || 'CORP_ALPHA, BANK_DELTA';

  const renderHeader = () => {
    switch (activeTab) {
      case 'portfolios':
        return (
          <PageHeader
            title="My Clients"
            subtitle="Assigned enterprise client accounts and workforce training contracts."
            badge="PORTFOLIO"
            badgeType="info"
          />
        );
      case 'reports':
        return (
          <PageHeader
            title="Client Reports"
            subtitle="Training completion audits, attendance summaries, and certification status."
            badge="COMPLIANCE"
            badgeType="default"
          />
        );
      case 'records':
      default:
        return (
          <PageHeader
            title="Home"
            subtitle="Training progress, attendance status, and verification for your assigned clients."
            badge={`SCOPE: ${assignedScope}`}
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
