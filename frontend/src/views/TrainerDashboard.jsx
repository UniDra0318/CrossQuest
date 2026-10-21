import React from 'react';
import { TrainerProvider } from '../trainer/TrainerContext';
import TrainerLayout from '../trainer/TrainerLayout';
import Cohorts from '../trainer/pages/Cohorts';
import Roster from '../trainer/pages/Roster';
import Grade from '../trainer/pages/Grade';
import Quiz from '../trainer/pages/Quiz';
import Analytics from '../trainer/pages/Analytics';

export default function TrainerDashboard({ activeSubView, setActiveView }) {
  const currentTab =
    activeSubView === 'trainee_roster' || activeSubView === 'roster'
      ? 'roster'
      : activeSubView === 'grade_entry' || activeSubView === 'grade'
      ? 'grade'
      : activeSubView === 'quiz_creator' || activeSubView === 'quiz'
      ? 'quiz'
      : activeSubView === 'trainer_analytics' || activeSubView === 'analytics'
      ? 'analytics'
      : 'cohorts';

  const handleTabChange = (tabId) => {
    if (!setActiveView) return;
    if (tabId === 'roster') setActiveView('trainee_roster');
    else if (tabId === 'grade') setActiveView('grade_entry');
    else if (tabId === 'quiz') setActiveView('quiz_creator');
    else if (tabId === 'analytics') setActiveView('trainer_analytics');
    else setActiveView('trainer_courses');
  };

  return (
    <TrainerProvider>
      <TrainerLayout activeTab={currentTab} onTabChange={handleTabChange}>
        {currentTab === 'cohorts' && <Cohorts onNavigateTab={handleTabChange} />}
        {currentTab === 'roster' && <Roster onNavigateTab={handleTabChange} />}
        {currentTab === 'grade' && <Grade onNavigateTab={handleTabChange} />}
        {currentTab === 'quiz' && <Quiz onNavigateTab={handleTabChange} />}
        {currentTab === 'analytics' && <Analytics onNavigateTab={handleTabChange} />}
      </TrainerLayout>
    </TrainerProvider>
  );
}
