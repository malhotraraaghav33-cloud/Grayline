import React from 'react';
import { useApp } from '../../context/AppContext';

export const BottomBar: React.FC = () => {
  const { 
    patients, 
    timeline, 
    setIsMascalModalOpen, 
    setActiveTab, 
    exportSITREPCSV,
    mascalActive
  } = useApp();

  const total = patients.length || 1;
  const critCount = patients.filter(p => p.triagePriority === 'CRITICAL').length;
  const prioCount = patients.filter(p => p.triagePriority === 'PRIORITY').length;
  const stblCount = patients.filter(p => p.triagePriority === 'STABLE').length;

  const critPercent = Math.round((critCount / total) * 100);
  const prioPercent = Math.round((prioCount / total) * 100);
  const stblPercent = 100 - critPercent - prioPercent;

  const recentEvents = timeline.slice(0, 4);

  return (
    <footer className="border-t border-[#45483f] bg-[#0b0f0b] shrink-0 select-none">
      {/* Status Bar & Quick Actions Strip */}
      <div className="flex flex-wrap justify-between items-center px-3 py-1 bg-[#1d211c] border-b border-[#45483f] gap-2">
        {/* Priority Distribution Bar Indicator */}
        <div className="flex items-center gap-3">
          <span className="font-['IBM_Plex_Sans'] text-[11px] font-semibold text-[#909287] uppercase">
            TRIAGE RATIO:
          </span>
          <div className="flex items-center gap-2">
            <div className="w-36 sm:w-44 h-3 bg-[#323630] flex border border-[#45483f] overflow-hidden">
              <div 
                className="bg-[#ffb4ab] h-full transition-all duration-300" 
                style={{ width: `${critPercent}%` }} 
                title={`${critPercent}% Critical`}
              />
              <div 
                className="bg-[#d2c6a4] h-full transition-all duration-300" 
                style={{ width: `${prioPercent}%` }} 
                title={`${prioPercent}% Priority`}
              />
              <div 
                className="bg-[#bfcba8] h-full transition-all duration-300" 
                style={{ width: `${stblPercent}%` }} 
                title={`${stblPercent}% Stable`}
              />
            </div>
            <span className="font-['Space_Mono'] text-[10px] text-[#c6c7bc]">
              {critPercent}% C / {prioPercent}% P / {stblPercent}% S
            </span>
          </div>
        </div>

        {/* Bottom Operational Action Triggers */}
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => setIsMascalModalOpen(true)}
            className={`border px-3 py-1 font-['Space_Mono'] text-[11px] uppercase tracking-wider transition-colors flex items-center gap-1 font-bold ${
              mascalActive 
                ? 'bg-[#ffb4ab] text-[#690005] border-[#ffb4ab]' 
                : 'bg-[#93000a] text-[#ffdad6] hover:bg-[#ffb4ab]/40 border-[#ffb4ab]'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">warning</span>
            <span>{mascalActive ? 'MASCAL ESCALATED' : 'DECLARE MASCAL'}</span>
          </button>

          <button 
            onClick={() => setActiveTab('evac')}
            className="bg-[#596447] text-[#d4e0bc] hover:bg-[#bfcba8] hover:text-[#2a341b] border border-[#bfcba8]/50 px-3 py-1 font-['Space_Mono'] text-[11px] uppercase tracking-wider transition-colors flex items-center gap-1 font-bold"
          >
            <span className="material-symbols-outlined text-[14px]">alt_route</span>
            <span>CALCULATE EVAC CORRIDOR</span>
          </button>

          <button 
            onClick={exportSITREPCSV}
            className="bg-[#323630] text-[#d2c6a4] hover:text-[#e0e4dc] hover:bg-[#272b26] border border-[#45483f] px-3 py-1 font-['Space_Mono'] text-[11px] uppercase tracking-wider transition-colors flex items-center gap-1 font-bold"
          >
            <span className="material-symbols-outlined text-[14px]">download</span>
            <span>EXPORT SITREP (CSV)</span>
          </button>
        </div>
      </div>

      {/* Live Triage Event Feed Strip */}
      <div className="flex items-center px-3 py-1 gap-3 overflow-x-auto whitespace-nowrap font-['Space_Mono'] text-[11px] custom-scroll">
        <span className="text-[#bfcba8] font-bold flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 bg-[#bfcba8] rounded-full animate-ping"></span>
          EVENT STREAM:
        </span>

        <div className="flex items-center gap-4 text-[#c6c7bc]">
          {recentEvents.map((evt, idx) => (
            <React.Fragment key={evt.id}>
              <span className="flex items-center gap-1.5">
                <span className="text-[#909287]">{evt.zuluTime}</span> — 
                <span className={`font-bold ${
                  evt.severity === 'CRITICAL' ? 'text-[#ffb4ab]' :
                  evt.severity === 'WARNING' ? 'text-[#d2c6a4]' :
                  evt.severity === 'SUCCESS' ? 'text-[#bfcba8]' : 'text-[#e0e4dc]'
                }`}>
                  {evt.title}
                </span>
                <span className="text-[#e0e4dc] opacity-80 truncate max-w-md hidden sm:inline">
                  {evt.detail}
                </span>
              </span>
              {idx < recentEvents.length - 1 && (
                <span className="text-[#45483f]">|</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </footer>
  );
};
