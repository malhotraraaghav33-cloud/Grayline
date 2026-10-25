import React from 'react';
import { useApp } from '../../context/AppContext';

export const ReportsAnalyticsScreen: React.FC = () => {
  const { 
    patients, 
    facilities, 
    hazards, 
    timeline, 
    mascalActive, 
    exportSITREPCSV 
  } = useApp();

  const totalPatients = patients.length;
  const critCount = patients.filter(p => p.triagePriority === 'CRITICAL').length;
  const prioCount = patients.filter(p => p.triagePriority === 'PRIORITY').length;
  const stblCount = patients.filter(p => p.triagePriority === 'STABLE').length;

  const waitingTriage = patients.filter(p => p.status === 'WAITING_TRIAGE').length;
  const triaged = patients.filter(p => p.status === 'TRIAGED').length;
  const evacPending = patients.filter(p => p.status === 'EVAC_PENDING').length;
  const enRoute = patients.filter(p => p.status === 'EN_ROUTE').length;
  const delivered = patients.filter(p => p.status === 'DELIVERED').length;

  const activeHazards = hazards.filter(h => h.status === 'ACTIVE').length;
  const roadblocks = hazards.filter(h => h.status === 'ACTIVE' && h.blocksRoadId).length;
  const verifiedHazards = hazards.filter(h => h.verificationStatus === 'VERIFIED').length;

  const totalBeds = facilities.reduce((sum, f) => sum + f.totalCapacity, 0);
  const occupiedBeds = facilities.reduce((sum, f) => sum + f.occupiedBeds, 0);
  const totalICUBeds = facilities.reduce((sum, f) => sum + f.icuCapacity, 0);
  const occupiedICUBeds = facilities.reduce((sum, f) => sum + f.icuOccupied, 0);
  const overallOccupancy = Math.round((occupiedBeds / totalBeds) * 100);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#101410] overflow-hidden select-none print:bg-white print:text-black">
      {/* Top Header */}
      <div className="p-2 border-b border-[#45483f] bg-[#1d211c] flex flex-wrap justify-between items-center gap-2 shrink-0 print:hidden">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#bfcba8]">assessment</span>
          <div>
            <span className="font-['IBM_Plex_Sans'] text-base font-bold text-[#e0e4dc] uppercase block">
              SITUATION REPORT (SITREP) & ANALYTICS
            </span>
            <span className="font-['Space_Mono'] text-[10px] text-[#909287]">
              EXECUTIVE BRIEFING // LIVE SECTOR 4 SYNTHESIS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3 py-1 bg-[#272b26] hover:bg-[#323630] border border-[#45483f] text-[#e0e4dc] font-['Space_Mono'] text-xs uppercase flex items-center gap-1 font-bold"
          >
            <span className="material-symbols-outlined text-[14px]">print</span>
            PRINT SITREP
          </button>

          <button
            onClick={exportSITREPCSV}
            className="px-3 py-1 bg-[#596447] text-[#d4e0bc] hover:bg-[#bfcba8] hover:text-[#2a341b] border border-[#bfcba8]/50 font-['Space_Mono'] text-xs uppercase flex items-center gap-1 font-bold"
          >
            <span className="material-symbols-outlined text-[14px]">download</span>
            DOWNLOAD SITREP CSV
          </button>
        </div>
      </div>

      {/* Printable Report Body */}
      <div className="flex-1 p-4 overflow-y-auto custom-scroll space-y-4 max-w-5xl mx-auto w-full">
        {/* Document Header */}
        <div className="border-b-2 border-[#bfcba8] pb-3 flex justify-between items-start">
          <div>
            <div className="font-['Space_Mono'] text-xs text-[#bfcba8] font-bold">
              TACTICAL OPERATIONS CENTER // SECTOR 4
            </div>
            <h1 className="font-['IBM_Plex_Sans'] text-2xl font-bold text-[#e0e4dc] print:text-black uppercase">
              FIELD RESPONSE 07 — CASUALTY & LOGISTICS SITREP
            </h1>
            <div className="font-['Space_Mono'] text-xs text-[#909287] mt-1">
              REPORT TIMESTAMPS: {new Date().toISOString()} // MASCAL STATUS: {mascalActive ? 'DECLARED ACTIVE' : 'STANDARD POSTURE'}
            </div>
          </div>

          <div className="text-right font-['Space_Mono'] text-xs text-[#c6c7bc] print:text-black">
            <div>SEC NET: AES-256 SECURE</div>
            <div>MESH NODE: TAC-04B</div>
          </div>
        </div>

        {/* Executive Summary Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-['Space_Mono'] text-center">
          <div className="p-3 bg-[#191d18] border border-[#45483f] print:border-gray-400">
            <span className="text-[10px] text-[#909287] block uppercase">Total Casualties</span>
            <span className="text-2xl font-bold text-[#e0e4dc] print:text-black">{totalPatients}</span>
          </div>
          <div className="p-3 bg-[#191d18] border border-[#ffb4ab]/50 print:border-gray-400">
            <span className="text-[10px] text-[#ffb4ab] block uppercase font-bold">Critical (P1)</span>
            <span className="text-2xl font-bold text-[#ffb4ab]">{critCount}</span>
          </div>
          <div className="p-3 bg-[#191d18] border border-[#d2c6a4]/50 print:border-gray-400">
            <span className="text-[10px] text-[#d2c6a4] block uppercase font-bold">Priority (P2)</span>
            <span className="text-2xl font-bold text-[#d2c6a4]">{prioCount}</span>
          </div>
          <div className="p-3 bg-[#191d18] border border-[#bfcba8]/50 print:border-gray-400">
            <span className="text-[10px] text-[#bfcba8] block uppercase font-bold">Stable (P3)</span>
            <span className="text-2xl font-bold text-[#bfcba8]">{stblCount}</span>
          </div>
        </div>

        {/* Evacuation Progression Status */}
        <div className="p-3 bg-[#191d18] border border-[#45483f] font-['Space_Mono'] text-xs print:border-gray-400">
          <span className="text-xs text-[#bfcba8] font-bold uppercase block mb-2">
            CASUALTY EVACUATION PIPELINE
          </span>
          <div className="grid grid-cols-5 gap-2 text-center">
            <div className="p-2 bg-[#0b0f0b] border border-[#45483f]">
              <span className="text-[9px] text-[#909287] block">WAITING TRIAGE</span>
              <span className="text-lg font-bold text-[#ffb4ab]">{waitingTriage}</span>
            </div>
            <div className="p-2 bg-[#0b0f0b] border border-[#45483f]">
              <span className="text-[9px] text-[#909287] block">TRIAGED</span>
              <span className="text-lg font-bold text-[#e0e4dc]">{triaged}</span>
            </div>
            <div className="p-2 bg-[#0b0f0b] border border-[#45483f]">
              <span className="text-[9px] text-[#909287] block">EVAC PENDING</span>
              <span className="text-lg font-bold text-[#d2c6a4]">{evacPending}</span>
            </div>
            <div className="p-2 bg-[#0b0f0b] border border-[#45483f]">
              <span className="text-[9px] text-[#909287] block">EN ROUTE</span>
              <span className="text-lg font-bold text-[#bfcba8]">{enRoute}</span>
            </div>
            <div className="p-2 bg-[#0b0f0b] border border-[#45483f]">
              <span className="text-[9px] text-[#909287] block">DELIVERED</span>
              <span className="text-lg font-bold text-[#bfcba8]">{delivered}</span>
            </div>
          </div>
        </div>

        {/* Medical Facilities Breakdown */}
        <div className="p-3 bg-[#191d18] border border-[#45483f] font-['Space_Mono'] text-xs print:border-gray-400">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-[#bfcba8] font-bold uppercase">
              REGIONAL SURGICAL & ICU SURGE DISPOSITION
            </span>
            <span className="text-[#909287]">
              NETWORK CAPACITY: {occupiedBeds}/{totalBeds} BEDS ({overallOccupancy}%) // ICU: {occupiedICUBeds}/{totalICUBeds}
            </span>
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#0b0f0b] text-[#909287] text-[10px] border-b border-[#45483f]">
              <tr>
                <th className="p-1.5">FACILITY</th>
                <th className="p-1.5">TYPE</th>
                <th className="p-1.5 text-center">OCCUPANCY</th>
                <th className="p-1.5 text-center">CAPACITY %</th>
                <th className="p-1.5 text-center">ICU BEDS</th>
                <th className="p-1.5 text-center">BLOOD (U)</th>
                <th className="p-1.5 text-right">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#45483f] text-[#e0e4dc]">
              {facilities.map(f => {
                const pct = Math.round((f.occupiedBeds / f.totalCapacity) * 100);
                return (
                  <tr key={f.id} className="hover:bg-[#272b26]">
                    <td className="p-1.5 font-bold">{f.id}: {f.name}</td>
                    <td className="p-1.5 text-[10px] text-[#c6c7bc]">{f.type}</td>
                    <td className="p-1.5 text-center">{f.occupiedBeds} / {f.totalCapacity}</td>
                    <td className="p-1.5 text-center font-bold">{pct}%</td>
                    <td className="p-1.5 text-center">{f.icuOccupied} / {f.icuCapacity}</td>
                    <td className="p-1.5 text-center text-[#bfcba8]">{f.bloodUnitsAvailable}</td>
                    <td className="p-1.5 text-right font-bold text-[10px]">{f.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Hazard & Arterial Obstacles Summary */}
        <div className="p-3 bg-[#191d18] border border-[#45483f] font-['Space_Mono'] text-xs print:border-gray-400">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-[#d2c6a4] font-bold uppercase">
              SECTOR HAZARD & ARTERIAL STATUS
            </span>
            <span className="text-[#909287]">
              {activeHazards} ACTIVE HAZARDS // {roadblocks} ROADBLOCKS ENFORCED
            </span>
          </div>

          <div className="space-y-1.5">
            {hazards.filter(h => h.status === 'ACTIVE').map(h => (
              <div key={h.id} className="p-2 bg-[#0b0f0b] border border-[#45483f] flex justify-between items-center">
                <div>
                  <span className="text-[#d2c6a4] font-bold">{h.code}: {h.title}</span>
                  <div className="text-[10px] text-[#909287]">{h.locationDescription} — {h.description}</div>
                </div>
                <div className="text-right text-[10px]">
                  <span className={h.severity === 'HIGH' ? 'text-[#ffb4ab] font-bold' : 'text-[#d2c6a4]'}>
                    {h.severity} SEVERITY
                  </span>
                  <div className="text-[#909287]">{h.verificationStatus}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Audit Timeline Stream */}
        <div className="p-3 bg-[#191d18] border border-[#45483f] font-['Space_Mono'] text-xs print:border-gray-400">
          <span className="text-xs text-[#bfcba8] font-bold uppercase block mb-2">
            CRITICAL EVENT TIMELINE AUDIT (LAST 5 EVENTS)
          </span>
          <div className="space-y-1">
            {timeline.slice(0, 5).map(evt => (
              <div key={evt.id} className="p-1.5 bg-[#0b0f0b] border border-[#45483f] flex justify-between items-center text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-[#909287]">{evt.zuluTime}</span>
                  <span className="font-bold text-[#e0e4dc]">{evt.title}</span>
                </div>
                <span className="text-[10px] text-[#c6c7bc]">{evt.detail}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Military Exercise Sign-off */}
        <div className="border-t border-[#45483f] pt-3 text-[10px] font-['Space_Mono'] text-[#909287] flex justify-between">
          <span>CLASSIFICATION: DEFENSE EXERCISE DEMO ONLY // NOT LIVE MEDICAL DATA</span>
          <span>COMMAND SIGN-OFF: MAJ. V. CHEN (TAC-MED 04)</span>
        </div>
      </div>
    </div>
  );
};
