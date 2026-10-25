import React from 'react';
import { useApp, NavigationTab } from '../../context/AppContext';

interface NavItem {
  id: NavigationTab;
  label: string;
  icon: string;
  fillIcon?: boolean;
  badge?: string;
  badgeClass?: string;
}

export const TacticalSidebar: React.FC<{ isMobileOpen?: boolean; onCloseMobile?: () => void }> = ({ 
  isMobileOpen = false, 
  onCloseMobile 
}) => {
  const { 
    activeTab, 
    setActiveTab, 
    patients, 
    hazards, 
    setIsMedevacModalOpen 
  } = useApp();

  const critCount = patients.filter(p => p.triagePriority === 'CRITICAL').length;
  const activeHazardsCount = hazards.filter(h => h.status === 'ACTIVE').length;

  const navItems: NavItem[] = [
    { 
      id: 'overview', 
      label: 'Command Overview', 
      icon: 'dashboard', 
      fillIcon: true 
    },
    { 
      id: 'patients', 
      label: 'Patient Monitoring', 
      icon: 'monitor_heart', 
      badge: `${critCount} CRIT`, 
      badgeClass: 'text-[#ffb4ab] font-[\'Space_Mono\'] bg-[#93000a]/40 border border-[#ffb4ab]/30' 
    },
    { 
      id: 'triage', 
      label: 'Triage Queue', 
      icon: 'emergency', 
      badge: `${patients.length} TOTAL`, 
      badgeClass: 'text-[#d2c6a4] font-[\'Space_Mono\']' 
    },
    { 
      id: 'evac', 
      label: 'Evacuation Planner', 
      icon: 'explore' 
    },
    { 
      id: 'facilities', 
      label: 'Medical Facilities', 
      icon: 'local_hospital' 
    },
    { 
      id: 'hazards', 
      label: 'Hazard Management', 
      icon: 'warning', 
      badge: `${activeHazardsCount} ACT`, 
      badgeClass: 'text-[#efe2bf] font-[\'Space_Mono\']' 
    },
    { 
      id: 'timeline', 
      label: 'Incident Timeline', 
      icon: 'history' 
    },
    { 
      id: 'reports', 
      label: 'Reports & Analytics', 
      icon: 'assessment' 
    },
    { 
      id: 'offline', 
      label: 'Offline & Sync', 
      icon: 'sync_saved_locally' 
    },
    { 
      id: 'sim', 
      label: 'Sim Controls', 
      icon: 'tune' 
    }
  ];

  const handleSelect = (tab: NavigationTab) => {
    setActiveTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
        />
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-40
        w-60 bg-[#191d18] border-r border-[#45483f] flex flex-col justify-between shrink-0 select-none
        transition-transform duration-200 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Upper Section: TOC Banner & Primary Navigation */}
        <div className="flex flex-col">
          <div className="p-3 border-b border-[#45483f] bg-[#1d211c]">
            <div className="flex items-center justify-between">
              <span className="font-['IBM_Plex_Sans'] text-base font-bold text-[#e0e4dc]">
                TOC SECTOR 4
              </span>
              <span className="w-2 h-2 rounded-full bg-[#bfcba8] animate-pulse"></span>
            </div>
            <div className="font-['Space_Mono'] text-[11px] text-[#c6c7bc] tracking-wider mt-0.5">
              SYS NET: SECURE // 99.8%
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex flex-col py-1 overflow-y-auto max-h-[calc(100vh-190px)] custom-scroll">
            {navItems.map(item => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`
                    w-full text-left flex items-center justify-between px-3 py-2 rounded-none font-['Space_Mono'] text-[11px] uppercase tracking-wider transition-colors duration-150
                    ${isActive 
                      ? 'bg-[#596447] text-[#d4e0bc] border-l-4 border-[#bfcba8]' 
                      : 'text-[#c6c7bc] hover:bg-[#272b26] hover:text-[#bfcba8] border-l-4 border-transparent'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span 
                      className="material-symbols-outlined text-[18px] shrink-0"
                      style={item.fillIcon && isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                    >
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className={`text-[10px] px-1 shrink-0 ${item.badgeClass || ''}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tactical Sidebar Footer */}
        <div className="p-2 border-t border-[#45483f] bg-[#0b0f0b]">
          <button 
            onClick={() => setIsMedevacModalOpen(true)}
            className="w-full bg-[#596447] text-[#d4e0bc] border border-[#bfcba8]/50 py-1.5 font-['Space_Mono'] text-[11px] uppercase tracking-wider hover:bg-[#bfcba8] hover:text-[#2a341b] active:bg-[#323630] transition-colors mb-1.5 flex items-center justify-center gap-1 font-bold"
          >
            <span className="material-symbols-outlined text-[16px]">helicopter</span>
            DISPATCH MEDEVAC
          </button>
          <div className="text-[10px] font-['Space_Mono'] text-[#909287] text-center uppercase tracking-wider">
            SIMULATION MODE // VER 2.4.1-TAC
          </div>
        </div>
      </aside>
    </>
  );
};
