import React from 'react';
import AdminPeerReviewAnomalyDesk from '../../components/AdminPeerReviewAnomalyDesk';

export default function Alerts({ onRuleUpdated }) {
  return (
    <div className="adm-alerts-page" style={{ marginTop: '20px' }}>
      <AdminPeerReviewAnomalyDesk onRuleUpdated={onRuleUpdated} />
    </div>
  );
}

