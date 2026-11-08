import React from 'react';
import AdminPeerReviewAnomalyDesk from '../../components/AdminPeerReviewAnomalyDesk';

export default function Alerts({ anomalies, onDispositionComplete, currentUser }) {
  return (
    <div className="adm-alerts-page" style={{ marginTop: '20px' }}>
      <AdminPeerReviewAnomalyDesk
        anomalies={anomalies}
        onDispositionComplete={onDispositionComplete}
        currentUser={currentUser}
      />
    </div>
  );
}
