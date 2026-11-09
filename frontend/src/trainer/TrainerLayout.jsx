import React from 'react';
import PageHeader from '../components/PageHeader';
import '../styles/admin.css';
import './trainer.css';

/**
 * TrainerLayout - clean layout for Lead Trainers.
 * Conforms to UI/UX Improvement Plan:
 * - Replaces 280px hero banner with slim PageHeader
 * - Removes BitMascot and floating chips from trainer workspace
 * - Removes "Instant Pop-Up Quiz" from header (out of pilot scope)
 * - Navigation handled by persistent sidebar
 */
export default function TrainerLayout({ activeTab, children }) {
  const renderHeader = () => {
    switch (activeTab) {
      case 'session_detail':
        return (
          <PageHeader
            title="Session Workspace"
            subtitle="Inspect cohort roster, participant attendance, and execute sign-off."
            badge="INSTRUCTOR"
            badgeType="info"
          />
        );
      case 'quiz':
        return (
          <PageHeader
            title="Quizzes and Teams"
            subtitle="Author quiz questions, assessment rubrics, and team challenges."
            badge="ASSESSMENT STUDIO"
            badgeType="default"
          />
        );
      case 'analytics':
        return (
          <PageHeader
            title="Results"
            subtitle="Cohort pass rates, competency milestones, and question performance breakdown."
            badge="ANALYTICS"
            badgeType="success"
          />
        );
      case 'cohorts':
      default:
        return (
          <PageHeader
            title="Sessions"
            subtitle="Active training cohorts, scheduled course deliveries, and upcoming sessions."
            badge="ACTIVE INSTRUCTOR"
            badgeType="success"
          />
        );
    }
  };

  return (
    <div className="adm-main trainer-dashboard">
      {renderHeader()}

      {/* Page View Content */}
      <div>
        {children}
      </div>
    </div>
  );
}
