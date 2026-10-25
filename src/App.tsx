/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { TopHeader } from './components/layout/TopHeader';
import { TacticalSidebar } from './components/layout/TacticalSidebar';
import { BottomBar } from './components/layout/BottomBar';
import { CommandOverviewScreen } from './components/screens/CommandOverviewScreen';
import { PatientMonitoringScreen } from './components/screens/PatientMonitoringScreen';
import { TriageQueueScreen } from './components/screens/TriageQueueScreen';
import { EvacuationPlannerScreen } from './components/screens/EvacuationPlannerScreen';
import { MedicalFacilitiesScreen } from './components/screens/MedicalFacilitiesScreen';
import { HazardManagementScreen } from './components/screens/HazardManagementScreen';
import { IncidentTimelineScreen } from './components/screens/IncidentTimelineScreen';
import { ReportsAnalyticsScreen } from './components/screens/ReportsAnalyticsScreen';
import { OfflineSyncScreen } from './components/screens/OfflineSyncScreen';
import { SimControlsScreen } from './components/screens/SimControlsScreen';
import { MascalDeclareModal } from './components/modals/MascalDeclareModal';
import { MedevacDispatchModal } from './components/modals/MedevacDispatchModal';
import { AddHazardModal } from './components/modals/AddHazardModal';

const MainShell: React.FC = () => {
  const { activeTab } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'overview':
        return <CommandOverviewScreen />;
      case 'patients':
        return <PatientMonitoringScreen />;
      case 'triage':
        return <TriageQueueScreen />;
      case 'evac':
        return <EvacuationPlannerScreen />;
      case 'facilities':
        return <MedicalFacilitiesScreen />;
      case 'hazards':
        return <HazardManagementScreen />;
      case 'timeline':
        return <IncidentTimelineScreen />;
      case 'reports':
        return <ReportsAnalyticsScreen />;
      case 'offline':
        return <OfflineSyncScreen />;
      case 'sim':
        return <SimControlsScreen />;
      default:
        return <CommandOverviewScreen />;
    }
  };

  return (
    <div className="bg-[#101410] text-[#e0e4dc] antialiased overflow-hidden h-screen flex flex-col font-['IBM_Plex_Sans'] select-none">
      {/* Persistent Top Navigation Bar */}
      <TopHeader onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)} />

      {/* Main Tactical Workspace: Sidebar + Screen */}
      <div className="flex flex-1 overflow-hidden relative">
        <TacticalSidebar 
          isMobileOpen={mobileMenuOpen} 
          onCloseMobile={() => setMobileMenuOpen(false)} 
        />
        <main className="flex-1 flex flex-col min-w-0 bg-[#101410] overflow-hidden">
          {renderActiveScreen()}
        </main>
      </div>

      {/* Persistent Bottom Status & Actions Drawer */}
      <BottomBar />

      {/* Operational Modals */}
      <MascalDeclareModal />
      <MedevacDispatchModal />
      <AddHazardModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainShell />
    </AppProvider>
  );
}
