import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TacticalMap } from '../map/TacticalMap';

export const CommandOverviewScreen: React.FC = () => {
  const { 
    patients, 
    facilities, 
    hazards, 
    syncQueue,
    updatePatient,
    assignPatientEvac,
    setIsMedevacModalOpen,
    setSelectedPatientId,
    setActiveTab
  } = useApp();

  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [editHR, setEditHR] = useState<number>(110);
  const [editSpO2, setEditSpO2] = useState<number>(94);
  const [editSBP, setEditSBP] = useState<number>(104);

  // Derived counts
  const totalPatients = patients.length;
  const criticalPatients = patients.filter(p => p.triagePriority === 'CRITICAL');
  const priorityPatients = patients.filter(p => p.triagePriority === 'PRIORITY');
  const stablePatients = patients.filter(p => p.triagePriority === 'STABLE');

  const activeHazards = hazards.filter(h => h.status === 'ACTIVE');
  const roadblockCount = hazards.filter(h => h.status === 'ACTIVE' && h.blocksRoadId).length;
  const unverifiedHazards = hazards.filter(h => h.verificationStatus === 'UNVERIFIED').length;

  const operationalFacilities = facilities.filter(f => f.receivingStatus).length;
  const med01 = facilities.find(f => f.id === 'MED-01') || facilities[0];
  const med02 = facilities.find(f => f.id === 'MED-02') || facilities[1];
  const med03 = facilities.find(f => f.id === 'MED-03') || facilities[2];

  const med01Cap = Math.round((med01.occupiedBeds / med01.totalCapacity) * 100);
  const med02Cap = Math.round((med02.occupiedBeds / med02.totalCapacity) * 100);
  const med03Cap = Math.round((med03.occupiedBeds / med03.totalCapacity) * 100);

  // Top 3 urgent cases
  const p104 = patients.find(p => p.id === 'P-104') || criticalPatients[0] || patients[0];
  const p112 = patients.find(p => p.id === 'P-112') || criticalPatients[1] || patients[1];
  const p108 = patients.find(p => p.id === 'P-108') || priorityPatients[0] || patients[2];

  const handleOpenVitalsModal = (pId: string) => {
    const target = patients.find(p => p.id === pId);
    if (target) {
      setEditHR(target.heartRate);
      setEditSpO2(target.spO2);
      setEditSBP(target.systolicBP);
      setEditingPatientId(pId);
    }
  };

  const handleSaveVitals = () => {
    if (editingPatientId) {
      updatePatient(editingPatientId, {
        heartRate: editHR,
        spO2: editSpO2,
        systolicBP: editSBP
      }, `Manual vitals adjustment: HR ${editHR}, SpO2 ${editSpO2}%, SBP ${editSBP}`);
      setEditingPatientId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#101410] overflow-hidden select-none">
      {/* ========================================================================= */}
      {/* 1. TOP METRIC CARDS ROW (5 Data-Dense Tactical Cells)                      */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1 p-1 border-b border-[#45483f] bg-[#1d211c] shrink-0">
        {/* Card 1: ACTIVE PATIENTS */}
        <div 
          onClick={() => setActiveTab('patients')}
          className="bg-[#191d18] border border-[#45483f] p-1.5 flex flex-col justify-between cursor-pointer hover:border-[#bfcba8] transition-colors"
        >
          <div className="flex justify-between items-center text-[#909287]">
            <span className="font-['IBM_Plex_Sans'] text-[11px] font-semibold text-[#c6c7bc] uppercase">ACTIVE PATIENTS</span>
            <span className="material-symbols-outlined text-[16px] text-[#bfcba8]">groups</span>
          </div>
          <div className="flex items-baseline justify-between mt-0.5">
            <span className="font-['Space_Mono'] text-xl font-bold text-[#e0e4dc]">{totalPatients}</span>
            <span className="font-['Space_Mono'] text-[10px] text-[#bfcba8] flex items-center">
              <span className="material-symbols-outlined text-[12px]">trending_up</span> +3 / 30m
            </span>
          </div>
          <div className="mt-0.5 flex gap-1 font-['Space_Mono'] text-[9px] text-[#c6c7bc] tracking-tighter">
            <span className="text-[#ffb4ab] font-bold">{criticalPatients.length} CRIT</span> | 
            <span className="text-[#d2c6a4] font-bold">{priorityPatients.length} PRIO</span> | 
            <span className="text-[#bfcba8] font-bold">{stablePatients.length} STBL</span>
          </div>
        </div>

        {/* Card 2: CRITICAL CASES */}
        <div 
          onClick={() => setActiveTab('triage')}
          className="bg-[#191d18] border border-[#ffb4ab]/50 p-1.5 flex flex-col justify-between relative overflow-hidden cursor-pointer hover:border-[#ffb4ab] transition-colors"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-[#ffb4ab]"></div>
          <div className="flex justify-between items-center text-[#ffb4ab] pl-1">
            <span className="font-['IBM_Plex_Sans'] text-[11px] uppercase font-bold text-[#ffb4ab]">CRITICAL CASES</span>
            <span className="px-1 bg-[#93000a] text-[#ffdad6] font-['Space_Mono'] text-[9px] border border-[#ffb4ab]/50 font-bold">IMMEDIATE</span>
          </div>
          <div className="flex items-baseline justify-between mt-0.5 pl-1">
            <span className="font-['Space_Mono'] text-xl font-bold text-[#ffb4ab]">{criticalPatients.length}</span>
            <span className="font-['Space_Mono'] text-[10px] text-[#ffb4ab] animate-pulse font-bold">AIR-EVAC REQ</span>
          </div>
          <div className="mt-0.5 pl-1 font-['Space_Mono'] text-[10px] text-[#c6c7bc] truncate">
            TARGETS: <span className="text-[#e0e4dc] font-bold">{criticalPatients.slice(0, 2).map(p => p.id).join(', ') || 'NONE'}</span>
          </div>
        </div>

        {/* Card 3: AVAILABLE FACILITIES */}
        <div 
          onClick={() => setActiveTab('facilities')}
          className="bg-[#191d18] border border-[#45483f] p-1.5 flex flex-col justify-between cursor-pointer hover:border-[#bfcba8] transition-colors"
        >
          <div className="flex justify-between items-center text-[#909287]">
            <span className="font-['IBM_Plex_Sans'] text-[11px] font-semibold text-[#c6c7bc] uppercase">AVAILABLE FACILITIES</span>
            <span className="material-symbols-outlined text-[16px] text-[#bfcba9]">local_hospital</span>
          </div>
          <div className="flex items-baseline justify-between mt-0.5">
            <span className="font-['Space_Mono'] text-xl font-bold text-[#e0e4dc]">{operationalFacilities} <span className="text-[#c6c7bc] text-xs font-normal">/ {facilities.length} OPERATIONAL</span></span>
            <span className="font-['Space_Mono'] text-[10px] text-[#bfcba8] font-bold">GREEN</span>
          </div>
          <div className="mt-0.5 flex justify-between font-['Space_Mono'] text-[10px] text-[#c6c7bc]">
            <span>MED-01: <span className="text-[#d2c6a4] font-bold">{med01Cap}%</span></span>
            <span>MED-02: <span className="text-[#bfcba8] font-bold">{med02Cap}%</span></span>
          </div>
        </div>

        {/* Card 4: REPORTED HAZARDS */}
        <div 
          onClick={() => setActiveTab('hazards')}
          className="bg-[#191d18] border border-[#d2c6a4]/40 p-1.5 flex flex-col justify-between cursor-pointer hover:border-[#d2c6a4] transition-colors"
        >
          <div className="flex justify-between items-center text-[#d2c6a4]">
            <span className="font-['IBM_Plex_Sans'] text-[11px] text-[#d2c6a4] uppercase font-bold">REPORTED HAZARDS</span>
            <span className="px-1 bg-[#51482f] text-[#c4b897] font-['Space_Mono'] text-[9px] border border-[#d2c6a4]/40 font-bold">{activeHazards.length} ACTIVE</span>
          </div>
          <div className="flex items-baseline justify-between mt-0.5">
            <span className="font-['Space_Mono'] text-xl font-bold text-[#d2c6a4]">{activeHazards.length}</span>
            <span className="font-['Space_Mono'] text-[10px] text-[#d2c6a4] font-bold">{roadblockCount} ROADBLOCKS</span>
          </div>
          <div className="mt-0.5 font-['Space_Mono'] text-[10px] text-[#c6c7bc] truncate">
            1 FLOOD ZONE // {unverifiedHazards} UNVERIFIED
          </div>
        </div>

        {/* Card 5: PENDING SYNC UPDATES */}
        <div 
          onClick={() => setActiveTab('offline')}
          className="col-span-2 sm:col-span-1 bg-[#191d18] border border-[#45483f] p-1.5 flex flex-col justify-between cursor-pointer hover:border-[#bfcba8] transition-colors"
        >
          <div className="flex justify-between items-center text-[#909287]">
            <span className="font-['IBM_Plex_Sans'] text-[11px] font-semibold text-[#c6c7bc] uppercase">PENDING SYNC UPDATES</span>
            <span className="material-symbols-outlined text-[16px] text-[#909287]">cloud_sync</span>
          </div>
          <div className="flex items-baseline justify-between mt-0.5">
            <span className="font-['Space_Mono'] text-xl font-bold text-[#e0e4dc]">{syncQueue.length} <span className="text-[#c6c7bc] text-xs font-normal">QUEUED</span></span>
            <span className="font-['Space_Mono'] text-[10px] text-[#bfcba8] font-bold">MESH ARMED</span>
          </div>
          <div className="mt-0.5 font-['Space_Mono'] text-[10px] text-[#c6c7bc] truncate">
            NODE TAC-04B <span className="text-[#bfcba8] font-bold">OK</span> // 1.2 KB
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. CORE TWO-PANE COCKPIT: TACTICAL MAP (62%) & OPERATIONS PANEL (38%)     */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* LEFT: TACTICAL MAP DISPLAY (SECTOR 4) */}
        <div className="h-[45vh] lg:h-full lg:w-[62%] border-b lg:border-b-0 lg:border-r border-[#45483f] flex flex-col relative bg-[#0b0f0b] overflow-hidden">
          <TacticalMap 
            onSelectPatient={(pId) => setSelectedPatientId(pId)}
            onSelectFacility={() => setActiveTab('facilities')}
          />
        </div>

        {/* RIGHT: OPERATIONS & TRIAGE QUEUE PANEL (38%) */}
        <div className="flex-1 lg:w-[38%] flex flex-col bg-[#1d211c] overflow-hidden min-h-0">
          {/* Urgent Case Queue Header */}
          <div className="p-2 border-b border-[#45483f] bg-[#272b26] flex justify-between items-center shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#ffb4ab] text-[18px]">priority_high</span>
              <span className="font-['IBM_Plex_Sans'] text-base font-semibold uppercase text-[#e0e4dc]">
                Urgent Case Queue
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-['Space_Mono'] text-[10px] text-[#ffb4ab] bg-[#93000a]/40 px-1 border border-[#ffb4ab]/50 font-bold">
                {criticalPatients.length} IMMEDIATE
              </span>
              <span className="font-['Space_Mono'] text-[10px] text-[#d2c6a4] bg-[#51482f]/40 px-1 border border-[#d2c6a4]/50 font-bold">
                {priorityPatients.length} PRIORITY
              </span>
            </div>
          </div>

          {/* Scrollable Casualty Deck */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scroll">
            {/* CASUALTY CARD 1: P-104 (CRITICAL) */}
            {p104 && (
              <div className="bg-[#191d18] border border-[#ffb4ab]/70 relative">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#ffb4ab]"></div>
                {/* Card Header */}
                <div className="p-2 pl-3 border-b border-[#45483f] flex justify-between items-start bg-[#93000a]/10">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-['IBM_Plex_Sans'] text-base font-bold text-[#e0e4dc]">PATIENT {p104.id}</span>
                      <span className="font-['Space_Mono'] text-[10px] bg-[#ffb4ab] text-[#0b0f0b] px-1 font-bold">
                        {p104.triagePriority} / RED
                      </span>
                    </div>
                    <div className="font-['Space_Mono'] text-[11px] text-[#ffb4ab] font-bold mt-0.5">
                      {p104.injurySummary.toUpperCase()}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-['Space_Mono'] text-[10px] text-[#909287] block">TSI: +00:24:10</span>
                    <span className="font-['Space_Mono'] text-[9px] text-[#bfcba8] font-bold">{p104.triageRuleHits[0] || 'RULE-01'} HIT</span>
                  </div>
                </div>

                {/* Vitals Telemetry Sub-bay */}
                <div className="p-2 pl-3 grid grid-cols-4 gap-1 border-b border-[#45483f] bg-[#0b0f0b]">
                  <div className="p-1 border border-[#45483f] bg-[#191d18] text-center">
                    <span className="font-['Space_Mono'] text-[9px] text-[#909287] block">HR / BPM</span>
                    <span className="font-['Space_Mono'] text-sm font-bold text-[#ffb4ab]">{p104.heartRate}</span>
                  </div>
                  <div className="p-1 border border-[#45483f] bg-[#191d18] text-center">
                    <span className="font-['Space_Mono'] text-[9px] text-[#909287] block">SPO2</span>
                    <span className="font-['Space_Mono'] text-sm font-bold text-[#ffb4ab]">{p104.spO2}%</span>
                  </div>
                  <div className="p-1 border border-[#45483f] bg-[#191d18] text-center">
                    <span className="font-['Space_Mono'] text-[9px] text-[#909287] block">BP MMHG</span>
                    <span className="font-['Space_Mono'] text-sm font-bold text-[#e0e4dc]">{p104.systolicBP}/{p104.diastolicBP}</span>
                  </div>
                  <div className="p-1 border border-[#45483f] bg-[#191d18] text-center">
                    <span className="font-['Space_Mono'] text-[9px] text-[#909287] block">RESP / MIN</span>
                    <span className="font-['Space_Mono'] text-sm font-bold text-[#ffb4ab]">{p104.respiratoryRate}</span>
                  </div>
                </div>

                {/* Diagnostics & Action Row */}
                <div className="p-2 pl-3 flex flex-wrap justify-between items-center bg-[#191d18] gap-2">
                  <div className="font-['IBM_Plex_Sans'] text-xs text-[#c6c7bc]">
                    Match: <span className="text-[#d2c6a4] font-['Space_Mono']">HYPOXIA + TACHYCARDIA</span>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedPatientId(p104.id);
                      setIsMedevacModalOpen(true);
                    }}
                    className="bg-[#596447] text-[#d4e0bc] hover:bg-[#bfcba8] hover:text-[#2a341b] border border-[#bfcba8]/50 px-2.5 py-1 font-['Space_Mono'] text-[11px] uppercase tracking-wider transition-colors flex items-center gap-1 font-bold"
                  >
                    <span className="material-symbols-outlined text-[14px]">flight_takeoff</span>
                    ASSIGN EVAC MED-01
                  </button>
                </div>
              </div>
            )}

            {/* CASUALTY CARD 2: P-112 (CRITICAL) */}
            {p112 && (
              <div className="bg-[#191d18] border border-[#ffb4ab]/50 relative">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#ffb4ab]"></div>
                <div className="p-2 pl-3 border-b border-[#45483f] flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-['IBM_Plex_Sans'] text-base font-bold text-[#e0e4dc]">PATIENT {p112.id}</span>
                      <span className="font-['Space_Mono'] text-[10px] bg-[#ffb4ab] text-[#0b0f0b] px-1 font-bold">
                        {p112.triagePriority} / RED
                      </span>
                    </div>
                    <div className="font-['Space_Mono'] text-[11px] text-[#ffb4ab] font-bold mt-0.5">
                      {p112.injurySummary.toUpperCase()}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-['Space_Mono'] text-[10px] text-[#909287] block">TSI: +00:38:40</span>
                    <span className="font-['Space_Mono'] text-[9px] text-[#ffb4ab] font-bold">BRADYCARDIC</span>
                  </div>
                </div>

                <div className="p-2 pl-3 grid grid-cols-4 gap-1 border-b border-[#45483f] bg-[#0b0f0b]">
                  <div className="p-1 border border-[#45483f] bg-[#191d18] text-center">
                    <span className="font-['Space_Mono'] text-[9px] text-[#909287] block">HR / BPM</span>
                    <span className="font-['Space_Mono'] text-sm font-bold text-[#ffb4ab]">{p112.heartRate}</span>
                  </div>
                  <div className="p-1 border border-[#45483f] bg-[#191d18] text-center">
                    <span className="font-['Space_Mono'] text-[9px] text-[#909287] block">SPO2</span>
                    <span className="font-['Space_Mono'] text-sm font-bold text-[#e0e4dc]">{p112.spO2}%</span>
                  </div>
                  <div className="p-1 border border-[#45483f] bg-[#191d18] text-center">
                    <span className="font-['Space_Mono'] text-[9px] text-[#909287] block">BP MMHG</span>
                    <span className="font-['Space_Mono'] text-sm font-bold text-[#ffb4ab]">{p112.systolicBP}/{p112.diastolicBP}</span>
                  </div>
                  <div className="p-1 border border-[#45483f] bg-[#191d18] text-center">
                    <span className="font-['Space_Mono'] text-[9px] text-[#909287] block">GCS SCORE</span>
                    <span className="font-['Space_Mono'] text-sm font-bold text-[#ffb4ab]">{p112.gcs}</span>
                  </div>
                </div>

                <div className="p-2 pl-3 flex flex-wrap justify-between items-center bg-[#191d18] gap-2">
                  <div className="font-['IBM_Plex_Sans'] text-xs text-[#909287]">
                    Status: Ground transport non-viable (Bridge out)
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedPatientId(p112.id);
                      setIsMedevacModalOpen(true);
                    }}
                    className="bg-[#323630] text-[#d2c6a4] border border-[#45483f] hover:border-[#d2c6a4] px-2.5 py-1 font-['Space_Mono'] text-[11px] uppercase tracking-wider transition-colors font-bold"
                  >
                    REQUEST ROTOR 02
                  </button>
                </div>
              </div>
            )}

            {/* CASUALTY CARD 3: P-108 (PRIORITY / AMBER) */}
            {p108 && (
              <div className="bg-[#191d18] border border-[#d2c6a4]/50 relative">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#d2c6a4]"></div>
                <div className="p-2 pl-3 border-b border-[#45483f] flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-['IBM_Plex_Sans'] text-base font-bold text-[#e0e4dc]">PATIENT {p108.id}</span>
                      <span className="font-['Space_Mono'] text-[10px] bg-[#51482f] text-[#c4b897] px-1 font-bold border border-[#d2c6a4]/40">
                        PRIORITY / AMBER
                      </span>
                    </div>
                    <div className="font-['Space_Mono'] text-[11px] text-[#d2c6a4] mt-0.5 font-bold">
                      {p108.injurySummary.toUpperCase()}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-['Space_Mono'] text-[10px] text-[#909287] block">TQ TIME: 13:45Z</span>
                    <span className="font-['Space_Mono'] text-[9px] text-[#d2c6a4] font-bold">TIMER: 00:47:08</span>
                  </div>
                </div>

                <div className="p-2 pl-3 grid grid-cols-4 gap-1 border-b border-[#45483f] bg-[#0b0f0b]">
                  <div className="p-1 border border-[#45483f] bg-[#191d18] text-center">
                    <span className="font-['Space_Mono'] text-[9px] text-[#909287] block">HR / BPM</span>
                    <span className="font-['Space_Mono'] text-sm font-bold text-[#d2c6a4]">{p108.heartRate}</span>
                  </div>
                  <div className="p-1 border border-[#45483f] bg-[#191d18] text-center">
                    <span className="font-['Space_Mono'] text-[9px] text-[#909287] block">SPO2</span>
                    <span className="font-['Space_Mono'] text-sm font-bold text-[#e0e4dc]">{p108.spO2}%</span>
                  </div>
                  <div className="p-1 border border-[#45483f] bg-[#191d18] text-center">
                    <span className="font-['Space_Mono'] text-[9px] text-[#909287] block">BP MMHG</span>
                    <span className="font-['Space_Mono'] text-sm font-bold text-[#e0e4dc]">{p108.systolicBP}/{p108.diastolicBP}</span>
                  </div>
                  <div className="p-1 border border-[#45483f] bg-[#191d18] text-center">
                    <span className="font-['Space_Mono'] text-[9px] text-[#909287] block">PAIN LVL</span>
                    <span className="font-['Space_Mono'] text-sm font-bold text-[#d2c6a4]">{p108.painLevel}/10</span>
                  </div>
                </div>

                <div className="p-2 pl-3 flex flex-wrap justify-between items-center bg-[#191d18] gap-2">
                  <div className="font-['IBM_Plex_Sans'] text-xs text-[#909287]">
                    Dest: {p108.assignedTransport || 'MED-02 GROUND CONVOY B'}
                  </div>
                  <button 
                    onClick={() => handleOpenVitalsModal(p108.id)}
                    className="bg-[#323630] text-[#c6c7bc] hover:text-[#e0e4dc] border border-[#45483f] px-2.5 py-1 font-['Space_Mono'] text-[11px] uppercase tracking-wider transition-colors font-bold"
                  >
                    UPDATE VITALS
                  </button>
                </div>
              </div>
            )}

            {/* SUB-BAY: LATEST HAZARD REPORTS */}
            <div className="border border-[#45483f] bg-[#0b0f0b] p-2 space-y-1.5">
              <div className="flex justify-between items-center border-b border-[#45483f] pb-1">
                <span className="font-['IBM_Plex_Sans'] text-[11px] text-[#d2c6a4] uppercase font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">report</span>
                  SECTOR HAZARD INTEL
                </span>
                <span className="font-['Space_Mono'] text-[9px] text-[#909287]">UPDATED 14:30Z</span>
              </div>

              <div className="p-2 bg-[#1d211c] border-l-2 border-[#ffb4ab]">
                <div className="flex justify-between font-['Space_Mono'] text-[10px]">
                  <span className="text-[#ffb4ab] font-bold">HZ-021: WAYPOINT CHARLIE</span>
                  <span className="text-[#909287]">RECON 2 VERIFIED</span>
                </div>
                <div className="font-['IBM_Plex_Sans'] text-xs text-[#e0e4dc] mt-0.5">
                  Bridge structural collapse. Arterial completely impassable to heavy ambulances. Est. clear: 4.5h.
                </div>
              </div>

              <div className="p-2 bg-[#1d211c] border-l-2 border-[#d2c6a4]">
                <div className="flex justify-between font-['Space_Mono'] text-[10px]">
                  <span className="text-[#d2c6a4] font-bold">HZ-028: POWER GRID SECTOR 4B</span>
                  <span className="text-[#909287]">UNVERIFIED FIELD RPT</span>
                </div>
                <div className="font-['IBM_Plex_Sans'] text-xs text-[#e0e4dc] mt-0.5">
                  Local feeder substation failure. Backup generators online at auxiliary rally points.
                </div>
              </div>
            </div>

            {/* SUB-BAY: FACILITY CAPACITY MINI-METERS */}
            <div className="border border-[#45483f] bg-[#0b0f0b] p-2">
              <div className="flex justify-between items-center border-b border-[#45483f] pb-1 mb-2">
                <span className="font-['IBM_Plex_Sans'] text-[11px] text-[#e0e4dc] uppercase font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-[#bfcba8]">domain</span>
                  FACILITY SURGE STATUS
                </span>
                <span className="font-['Space_Mono'] text-[9px] text-[#bfcba8] font-bold">
                  {operationalFacilities} RECEIVING
                </span>
              </div>

              {/* Meter 1: MED-01 */}
              <div className="space-y-1 mb-2">
                <div className="flex justify-between font-['Space_Mono'] text-[10px]">
                  <span className="text-[#e0e4dc]">{med01.name} ({med01.id})</span>
                  <span className="text-[#d2c6a4] font-bold">{med01Cap}% CAP // {med01.icuCapacity - med01.icuOccupied} ICU BEDS</span>
                </div>
                <div className="w-full bg-[#323630] h-2 border border-[#45483f]">
                  <div className="bg-[#d2c6a4] h-full transition-all duration-300" style={{ width: `${Math.min(100, med01Cap)}%` }}></div>
                </div>
              </div>

              {/* Meter 2: MED-02 */}
              <div className="space-y-1 mb-2">
                <div className="flex justify-between font-['Space_Mono'] text-[10px]">
                  <span className="text-[#e0e4dc]">{med02.name} ({med02.id})</span>
                  <span className="text-[#bfcba8] font-bold">{med02Cap}% CAP // {med02.icuCapacity - med02.icuOccupied} ICU BEDS</span>
                </div>
                <div className="w-full bg-[#323630] h-2 border border-[#45483f]">
                  <div className="bg-[#bfcba8] h-full transition-all duration-300" style={{ width: `${Math.min(100, med02Cap)}%` }}></div>
                </div>
              </div>

              {/* Meter 3: MED-03 */}
              <div className="space-y-1">
                <div className="flex justify-between font-['Space_Mono'] text-[10px]">
                  <span className="text-[#e0e4dc]">{med03.name} ({med03.id})</span>
                  <span className="text-[#ffb4ab] font-bold">{med03Cap}% CAP // CRITICAL AT CAPACITY</span>
                </div>
                <div className="w-full bg-[#323630] h-2 border border-[#45483f]">
                  <div className="bg-[#ffb4ab] h-full transition-all duration-300" style={{ width: `${Math.min(100, med03Cap)}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Quick Vitals Editor Modal */}
      {editingPatientId && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#1d211c] border-2 border-[#bfcba8] p-4 max-w-sm w-full font-['Space_Mono'] text-xs space-y-3">
            <div className="flex justify-between items-center border-b border-[#45483f] pb-2">
              <span className="font-bold text-[#e0e4dc]">TELEMETRY INJECTOR: {editingPatientId}</span>
              <button onClick={() => setEditingPatientId(null)} className="text-[#909287]">✕</button>
            </div>
            <div>
              <label className="text-[#909287] block mb-1">HEART RATE (BPM): {editHR}</label>
              <input 
                type="range" 
                min="40" 
                max="180" 
                value={editHR} 
                onChange={(e) => setEditHR(parseInt(e.target.value))} 
                className="w-full accent-[#bfcba8]"
              />
            </div>
            <div>
              <label className="text-[#909287] block mb-1">SPO2 (%): {editSpO2}%</label>
              <input 
                type="range" 
                min="70" 
                max="100" 
                value={editSpO2} 
                onChange={(e) => setEditSpO2(parseInt(e.target.value))} 
                className="w-full accent-[#bfcba8]"
              />
            </div>
            <div>
              <label className="text-[#909287] block mb-1">SYSTOLIC BP (MMHG): {editSBP}</label>
              <input 
                type="range" 
                min="60" 
                max="160" 
                value={editSBP} 
                onChange={(e) => setEditSBP(parseInt(e.target.value))} 
                className="w-full accent-[#bfcba8]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#45483f]">
              <button 
                onClick={() => setEditingPatientId(null)}
                className="px-3 py-1 bg-[#272b26] text-[#c6c7bc]"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveVitals}
                className="px-3 py-1 bg-[#596447] text-[#d4e0bc] font-bold"
              >
                Apply Updates
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
