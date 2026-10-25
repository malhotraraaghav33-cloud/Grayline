import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TRIAGE_RULES } from '../../services/triageEngine';
import { TriagePriority } from '../../types';

export const TriageQueueScreen: React.FC = () => {
  const { 
    patients, 
    markPatientReviewed, 
    setSelectedPatientId, 
    setIsMedevacModalOpen 
  } = useApp();

  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);

  const filteredPatients = patients.filter(p => {
    if (filterPriority !== 'ALL' && p.triagePriority !== filterPriority) return false;
    if (selectedRuleId && !p.triageRuleHits.includes(selectedRuleId)) return false;
    return true;
  });

  // Calculate rule hit frequencies
  const ruleHitCounts = TRIAGE_RULES.reduce((acc, rule) => {
    acc[rule.id] = patients.filter(p => p.triageRuleHits.includes(rule.id)).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#101410] overflow-hidden select-none">
      {/* Top Protocol Header */}
      <div className="p-2 border-b border-[#45483f] bg-[#1d211c] flex flex-wrap justify-between items-center gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#bfcba8]">emergency</span>
          <div>
            <span className="font-['IBM_Plex_Sans'] text-base font-bold text-[#e0e4dc] uppercase block">
              EXPLAINABLE TACTICAL TRIAGE QUEUE
            </span>
            <span className="font-['Space_Mono'] text-[10px] text-[#909287]">
              DETERMINISTIC RULE PROTOCOL // CLINICAL DECISION SUPPORT
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-['Space_Mono'] text-xs text-[#c6c7bc]">FILTER BY PRIORITY:</span>
          {(['ALL', 'CRITICAL', 'PRIORITY', 'STABLE'] as const).map(pri => (
            <button
              key={pri}
              onClick={() => setFilterPriority(pri)}
              className={`px-2 py-1 font-['Space_Mono'] text-xs uppercase transition-colors border ${
                filterPriority === pri 
                  ? 'bg-[#596447] text-[#d4e0bc] border-[#bfcba8] font-bold' 
                  : 'bg-[#191d18] text-[#c6c7bc] border-[#45483f] hover:border-[#909287]'
              }`}
            >
              {pri}
            </button>
          ))}
        </div>
      </div>

      {/* Main 2-Pane View: Rule Engine Catalog (30%) & Patient Queue (70%) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Left Side: Rule Engine Specifications */}
        <div className="lg:w-80 border-r border-[#45483f] bg-[#191d18] p-3 overflow-y-auto custom-scroll shrink-0">
          <div className="flex justify-between items-center border-b border-[#45483f] pb-2 mb-2">
            <span className="font-['Space_Mono'] text-xs text-[#bfcba8] font-bold uppercase">
              ACTIVE TRIAGE RULES [{TRIAGE_RULES.length}]
            </span>
            {selectedRuleId && (
              <button 
                onClick={() => setSelectedRuleId(null)}
                className="text-[10px] text-[#d2c6a4] underline font-['Space_Mono']"
              >
                Clear Filter
              </button>
            )}
          </div>

          <div className="space-y-2">
            {TRIAGE_RULES.map(rule => {
              const hits = ruleHitCounts[rule.id] || 0;
              const isSelected = selectedRuleId === rule.id;

              return (
                <div 
                  key={rule.id}
                  onClick={() => setSelectedRuleId(isSelected ? null : rule.id)}
                  className={`p-2 border transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-[#272b26] border-[#bfcba8]' 
                      : 'bg-[#1d211c] border-[#45483f] hover:border-[#909287]'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-['Space_Mono'] text-[11px] font-bold text-[#e0e4dc]">
                      {rule.id}
                    </span>
                    <span className={`px-1 text-[9px] font-['Space_Mono'] font-bold ${
                      rule.targetPriority === 'CRITICAL' ? 'bg-[#93000a] text-[#ffdad6]' :
                      rule.targetPriority === 'PRIORITY' ? 'bg-[#51482f] text-[#c4b897]' :
                      'bg-[#2a341b] text-[#d4e0bc]'
                    }`}>
                      {rule.targetPriority}
                    </span>
                  </div>

                  <div className="font-['IBM_Plex_Sans'] text-xs text-[#c6c7bc] font-semibold mt-1">
                    {rule.name}
                  </div>

                  <div className="font-['IBM_Plex_Sans'] text-[11px] text-[#909287] mt-0.5 leading-snug">
                    {rule.description}
                  </div>

                  <div className="mt-1.5 flex justify-between items-center text-[10px] font-['Space_Mono'] border-t border-[#45483f]/60 pt-1">
                    <span className="text-[#909287]">CATEGORY: {rule.category}</span>
                    <span className={`font-bold ${hits > 0 ? 'text-[#bfcba8]' : 'text-[#909287]'}`}>
                      {hits} ACTIVE HITS
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-2 bg-[#0b0f0b] border border-[#45483f] text-[10px] font-['Space_Mono'] text-[#909287]">
            ℹ️ <strong className="text-[#e0e4dc]">DEFENSE PROTOCOL NOTICE:</strong> All triage algorithms are deterministic rules configured for simulated tactical triage. No algorithmic decision supersedes direct qualified medical officer judgement.
          </div>
        </div>

        {/* Right Side: Evaluated Casualty Queue */}
        <div className="flex-1 p-3 overflow-y-auto custom-scroll space-y-3">
          <div className="flex justify-between items-center text-xs font-['Space_Mono'] text-[#909287]">
            <span>SHOWING {filteredPatients.length} CASUALTIES MATCHING PROTOCOL CRITERIA</span>
            {selectedRuleId && (
              <span className="text-[#d2c6a4] font-bold">FILTERED TO RULE: {selectedRuleId}</span>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {filteredPatients.map(patient => {
              const isCrit = patient.triagePriority === 'CRITICAL';
              const isPrio = patient.triagePriority === 'PRIORITY';
              const borderColor = isCrit ? 'border-[#ffb4ab]' : isPrio ? 'border-[#d2c6a4]' : 'border-[#45483f]';

              return (
                <div 
                  key={patient.id}
                  className={`bg-[#191d18] border ${borderColor} p-3 relative flex flex-col justify-between shadow-sm`}
                >
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${
                    isCrit ? 'bg-[#ffb4ab]' : isPrio ? 'bg-[#d2c6a4]' : 'bg-[#bfcba8]'
                  }`} />

                  {/* Header */}
                  <div className="pl-2 border-b border-[#45483f] pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-['IBM_Plex_Sans'] text-base font-bold text-[#e0e4dc]">
                            {patient.id}
                          </span>
                          {patient.callsign && (
                            <span className="font-['Space_Mono'] text-xs text-[#909287]">
                              ({patient.callsign})
                            </span>
                          )}
                          <span className={`px-1.5 py-0.5 text-[10px] font-['Space_Mono'] font-bold ${
                            isCrit ? 'bg-[#93000a] text-[#ffdad6]' :
                            isPrio ? 'bg-[#51482f] text-[#c4b897]' :
                            'bg-[#2a341b] text-[#d4e0bc]'
                          }`}>
                            {patient.triagePriority}
                          </span>
                        </div>
                        <div className="font-['IBM_Plex_Sans'] text-xs text-[#c6c7bc] mt-1">
                          {patient.injurySummary}
                        </div>
                      </div>

                      <div className="text-right font-['Space_Mono'] text-[10px]">
                        <span className="text-[#909287] block">Review:</span>
                        <span className={`font-bold ${
                          patient.reviewStatus === 'VERIFIED' ? 'text-[#bfcba8]' :
                          patient.reviewStatus === 'OVERRIDDEN' ? 'text-[#d2c6a4]' : 'text-[#ffb4ab]'
                        }`}>
                          {patient.reviewStatus}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Vitals matrix */}
                  <div className="pl-2 py-2 grid grid-cols-4 gap-1 text-center font-['Space_Mono'] text-xs">
                    <div className="p-1 bg-[#0b0f0b] border border-[#45483f]">
                      <span className="text-[9px] text-[#909287] block">HR</span>
                      <span className={`font-bold ${patient.heartRate > 120 || patient.heartRate < 50 ? 'text-[#ffb4ab]' : 'text-[#e0e4dc]'}`}>
                        {patient.heartRate}
                      </span>
                    </div>
                    <div className="p-1 bg-[#0b0f0b] border border-[#45483f]">
                      <span className="text-[9px] text-[#909287] block">SPO2</span>
                      <span className={`font-bold ${patient.spO2 < 90 ? 'text-[#ffb4ab]' : 'text-[#e0e4dc]'}`}>
                        {patient.spO2}%
                      </span>
                    </div>
                    <div className="p-1 bg-[#0b0f0b] border border-[#45483f]">
                      <span className="text-[9px] text-[#909287] block">BP</span>
                      <span className="font-bold text-[#e0e4dc]">
                        {patient.systolicBP}/{patient.diastolicBP}
                      </span>
                    </div>
                    <div className="p-1 bg-[#0b0f0b] border border-[#45483f]">
                      <span className="text-[9px] text-[#909287] block">RESP</span>
                      <span className="font-bold text-[#e0e4dc]">
                        {patient.respiratoryRate}
                      </span>
                    </div>
                  </div>

                  {/* Explainable Rationale */}
                  <div className="pl-2 py-2 bg-[#1d211c] border-t border-b border-[#45483f]">
                    <div className="font-['Space_Mono'] text-[10px] text-[#bfcba8] font-bold mb-0.5">
                      EXPLAINABLE RULE EVIDENCE:
                    </div>
                    <div className="font-['IBM_Plex_Sans'] text-xs text-[#e0e4dc]">
                      {patient.triageExplanation}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {patient.triageRuleHits.map(rId => (
                        <span key={rId} className="px-1.5 py-0.5 bg-[#0b0f0b] border border-[#45483f] font-['Space_Mono'] text-[9px] text-[#d2c6a4] font-bold">
                          HIT: {rId}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pl-2 pt-2 flex flex-wrap justify-between items-center gap-2">
                    <div className="text-[10px] font-['Space_Mono'] text-[#909287]">
                      Loc: {patient.locationName.split('(')[0]}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => markPatientReviewed(patient.id, 'MAJ. V. CHEN')}
                        className="px-2.5 py-1 bg-[#272b26] hover:bg-[#323630] border border-[#45483f] text-[#bfcba8] font-['Space_Mono'] text-[10px] uppercase font-bold"
                        title="Certify Triage Assessment"
                      >
                        Certify
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPatientId(patient.id);
                          setIsMedevacModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-[#596447] text-[#d4e0bc] hover:bg-[#bfcba8] hover:text-[#2a341b] border border-[#bfcba8]/50 font-['Space_Mono'] text-[10px] uppercase font-bold flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[13px]">flight_takeoff</span>
                        Evacuate
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
