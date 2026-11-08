import React from 'react';
import { TrainerProvider } from '../trainer/TrainerContext';
import TrainerLayout from '../trainer/TrainerLayout';
import Cohorts from '../trainer/pages/Cohorts';
import SessionDetail from '../trainer/pages/SessionDetail';
import Quiz from '../trainer/pages/Quiz';
import Analytics from '../trainer/pages/Analytics';

export default function TrainerDashboard({ activeSubView, setActiveView }) {
  const currentTab =
    activeSubView === 'trainer_session_detail' || activeSubView === 'session_detail'
      ? 'session_detail'
      : activeSubView === 'quiz_creator' || activeSubView === 'quiz'
      ? 'quiz'
      : activeSubView === 'trainer_analytics' || activeSubView === 'analytics'
      ? 'analytics'
      : 'cohorts';

  const handleTabChange = (tabId) => {
    if (!setActiveView) return;
    if (tabId === 'quiz') setActiveView('quiz_creator');
    else if (tabId === 'analytics') setActiveView('trainer_analytics');
    else setActiveView('trainer_courses');
  };

  return (
    <TrainerProvider>
      <TrainerLayout activeTab={currentTab} onTabChange={handleTabChange}>
        {currentTab === 'cohorts' && <Cohorts />}
        {currentTab === 'session_detail' && <SessionDetail />}
        {currentTab === 'quiz' && <Quiz />}
        {currentTab === 'analytics' && <Analytics />}
      </TrainerLayout>
    </TrainerProvider>
  );
}
