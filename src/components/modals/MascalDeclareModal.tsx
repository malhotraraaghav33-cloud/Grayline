import React from 'react';
import { useApp } from '../../context/AppContext';

export const MascalDeclareModal: React.FC = () => {
  const { 
    isMascalModalOpen, 
    setIsMascalModalOpen, 
    mascalActive, 
    setMascalActive,
    addTimelineEvent,
    patients 
  } = useApp();

  if (!isMascalModalOpen) return null;

  const critCount = patients.filter(p => p.triagePriority === 'CRITICAL').length;

  const handleToggle = () => {
    const nextState = !mascalActive;
    setMascalActive(nextState);
    setIsMascalModalOpen(false);

    addTimelineEvent({
      category: 'MASCAL',
      title: nextState ? '🚨 MASS CASUALTY INCIDENT (MASCAL) DECLARED' : 'MASCAL POSTURE STOOD DOWN',
      detail: nextState 
        ? `TOC Sector 4 transitioned to crisis standard of care. ${critCount} critical casualties prioritized for immediate rotary evacuation.`
        : 'Emergency operations returned to standard triage and evacuation routing.',
      severity: nextState ? 'CRITICAL' : 'SUCCESS'
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="bg-[#1d211c] border-2 border-[#ffb4ab] max-w-lg w-full p-4 relative shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#45483f] pb-2">
          <div className="flex items-center gap-2 text-[#ffb4ab]">
            <span className="material-symbols-outlined text-[24px]">e911_emergency</span>
            <span className="font-['IBM_Plex_Sans'] text-lg font-bold tracking-wider uppercase">
              {mascalActive ? 'MASCAL DE-ESCALATION PROTOCOL' : 'MASS CASUALTY (MASCAL) DECLARATION'}
            </span>
          </div>
          <button 
            onClick={() => setIsMascalModalOpen(false)}
            className="text-[#909287] hover:text-[#e0e4dc] font-bold text-lg"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="py-4 space-y-3 font-['IBM_Plex_Sans'] text-sm text-[#e0e4dc]">
          {!mascalActive ? (
            <>
              <div className="p-3 bg-[#93000a]/30 border border-[#ffb4ab]/50 text-[#ffb4ab] font-['Space_Mono'] text-xs">
                ⚠️ WARNING: Initiating MASCAL protocol reconfigures local triage rules to prioritize salvageable immediate casualties under severe resource constraints.
              </div>
              <p>
                Authorizing Commander: <strong className="text-[#bfcba8]">MAJ. V. CHEN (TAC-MED 04)</strong>
              </p>
              <p className="text-xs text-[#c6c7bc]">
                Current casualties exceeding standard surgical intake rate: 
                <span className="font-['Space_Mono'] text-[#ffb4ab] font-bold ml-1">{critCount} CRITICAL</span> cases awaiting rapid aeromedical evacuation.
              </p>
              <div className="font-['Space_Mono'] text-xs bg-[#191d18] p-2.5 border border-[#45483f] space-y-1">
                <div>• All operational facilities placed on SURGE alert</div>
                <div>• Rotor evac corridors designated priority air routes</div>
                <div>• Non-urgent routine medical transfers suspended</div>
                <div>• Tactical Mesh automated sitrep broadcast enabled</div>
              </div>
            </>
          ) : (
            <>
              <div className="p-3 bg-[#51482f]/30 border border-[#d2c6a4]/50 text-[#d2c6a4] font-['Space_Mono'] text-xs">
                Notice: Standing down MASCAL will restore routine triage priorities and normal admission thresholds across all Sector 4 field facilities.
              </div>
              <p>
                Confirm that casualty flow has normalized and surgical capacity has restabilized.
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[#45483f] pt-3">
          <button
            onClick={() => setIsMascalModalOpen(false)}
            className="px-4 py-1.5 bg-[#272b26] text-[#c6c7bc] hover:text-[#e0e4dc] border border-[#45483f] font-['Space_Mono'] text-xs uppercase"
          >
            Cancel
          </button>
          <button
            onClick={handleToggle}
            className={`px-4 py-1.5 font-['Space_Mono'] text-xs uppercase font-bold tracking-wider transition-colors border ${
              mascalActive
                ? 'bg-[#596447] text-[#d4e0bc] hover:bg-[#bfcba8] hover:text-[#2a341b] border-[#bfcba8]'
                : 'bg-[#93000a] text-[#ffdad6] hover:bg-[#ffb4ab] hover:text-[#690005] border-[#ffb4ab]'
            }`}
          >
            {mascalActive ? 'CONFIRM STAND-DOWN' : 'EXECUTE MASCAL DECLARATION'}
          </button>
        </div>
      </div>
    </div>
  );
};
