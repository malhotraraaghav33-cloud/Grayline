import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Patient, TriagePriority, PatientStatus } from '../../types';

export const PatientMonitoringScreen: React.FC = () => {
  const { 
    patients, 
    selectedPatientId, 
    setSelectedPatientId, 
    updatePatient, 
    markPatientReviewed,
    setIsMedevacModalOpen 
  } = useApp();

  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'id' | 'priority' | 'hr' | 'spo2' | 'time'>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Interactive vitals adjustment form
  const [adjHR, setAdjHR] = useState<number>(0);
  const [adjSpO2, setAdjSpO2] = useState<number>(0);
  const [adjSBP, setAdjSBP] = useState<number>(0);
  const [adjRR, setAdjRR] = useState<number>(0);
  const [overridePri, setOverridePri] = useState<TriagePriority | ''>('');

  const activePatient = patients.find(p => p.id === selectedPatientId) || patients[0];

  // Filtering
  const filteredPatients = patients.filter(p => {
    const matchesSearch = 
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      (p.callsign && p.callsign.toLowerCase().includes(search.toLowerCase())) ||
      p.incidentId.toLowerCase().includes(search.toLowerCase()) ||
      p.injurySummary.toLowerCase().includes(search.toLowerCase()) ||
      p.locationName.toLowerCase().includes(search.toLowerCase());

    const matchesPriority = priorityFilter === 'ALL' || p.triagePriority === priorityFilter;
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;

    return matchesSearch && matchesPriority && matchesStatus;
  });

  // Sorting
  const sortedPatients = [...filteredPatients].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'id') comparison = a.id.localeCompare(b.id);
    else if (sortBy === 'priority') {
      const prioWeight = { CRITICAL: 3, PRIORITY: 2, STABLE: 1, EXPECTANT: 0 };
      comparison = prioWeight[a.triagePriority] - prioWeight[b.triagePriority];
    } else if (sortBy === 'hr') comparison = a.heartRate - b.heartRate;
    else if (sortBy === 'spo2') comparison = a.spO2 - b.spO2;
    else if (sortBy === 'time') {
      comparison = new Date(a.lastObservationTimestamp).getTime() - new Date(b.lastObservationTimestamp).getTime();
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatientId(patient.id);
    setAdjHR(patient.heartRate);
    setAdjSpO2(patient.spO2);
    setAdjSBP(patient.systolicBP);
    setAdjRR(patient.respiratoryRate);
    setOverridePri('');
  };

  const handleApplyVitals = () => {
    if (!activePatient) return;
    updatePatient(activePatient.id, {
      heartRate: adjHR || activePatient.heartRate,
      spO2: adjSpO2 || activePatient.spO2,
      systolicBP: adjSBP || activePatient.systolicBP,
      respiratoryRate: adjRR || activePatient.respiratoryRate
    }, `Vitals manual correction applied: HR ${adjHR || activePatient.heartRate}, SpO2 ${adjSpO2 || activePatient.spO2}%`);
  };

  const handleVerify = () => {
    if (!activePatient) return;
    markPatientReviewed(
      activePatient.id, 
      'MAJ. V. CHEN', 
      overridePri ? (overridePri as TriagePriority) : undefined
    );
  };

  const handleStatusChange = (status: PatientStatus) => {
    if (!activePatient) return;
    updatePatient(activePatient.id, { status }, `Patient operational state updated to ${status}`);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#101410] overflow-hidden select-none">
      {/* Top Filter and Search Bar */}
      <div className="p-2 border-b border-[#45483f] bg-[#1d211c] flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#bfcba8]">monitor_heart</span>
          <span className="font-['IBM_Plex_Sans'] text-base font-bold text-[#e0e4dc] uppercase">
            CASUALTY TELEMETRY ROSTER
          </span>
          <span className="font-['Space_Mono'] text-xs text-[#909287]">
            ({filteredPatients.length} OF {patients.length} MONITORED)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2 top-1.5 text-[16px] text-[#909287]">
              search
            </span>
            <input
              type="text"
              placeholder="Search ID, callsign, trauma..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#191d18] border border-[#45483f] text-[#e0e4dc] pl-7 pr-2 py-1 font-['Space_Mono'] text-xs w-48 focus:border-[#bfcba8] outline-hidden"
            />
          </div>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-[#191d18] border border-[#45483f] text-[#e0e4dc] px-2 py-1 font-['Space_Mono'] text-xs outline-hidden"
          >
            <option value="ALL">PRIORITY: ALL</option>
            <option value="CRITICAL">CRITICAL / RED</option>
            <option value="PRIORITY">PRIORITY / AMBER</option>
            <option value="STABLE">STABLE / GREEN</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#191d18] border border-[#45483f] text-[#e0e4dc] px-2 py-1 font-['Space_Mono'] text-xs outline-hidden"
          >
            <option value="ALL">STATUS: ALL</option>
            <option value="WAITING_TRIAGE">WAITING TRIAGE</option>
            <option value="TRIAGED">TRIAGED</option>
            <option value="EVAC_PENDING">EVAC PENDING</option>
            <option value="EN_ROUTE">EN ROUTE</option>
            <option value="DELIVERED">DELIVERED</option>
          </select>

          {/* Sort selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#191d18] border border-[#45483f] text-[#e0e4dc] px-2 py-1 font-['Space_Mono'] text-xs outline-hidden"
          >
            <option value="priority">SORT: PRIORITY</option>
            <option value="id">SORT: PATIENT ID</option>
            <option value="hr">SORT: HEART RATE</option>
            <option value="spo2">SORT: SPO2</option>
            <option value="time">SORT: LAST OBSERVATION</option>
          </select>

          <button
            onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
            className="p-1 bg-[#191d18] border border-[#45483f] text-[#bfcba8] hover:bg-[#272b26]"
            title={`Toggle sort order (${sortOrder.toUpperCase()})`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
            </span>
          </button>
        </div>
      </div>

      {/* Main Workspace Split: Table (65%) and Details Deck (35%) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Casualty Table */}
        <div className="flex-1 overflow-auto custom-scroll border-r border-[#45483f]">
          <table className="w-full text-left font-['Space_Mono'] text-xs border-collapse">
            <thead className="sticky top-0 bg-[#1d211c] border-b border-[#45483f] text-[#909287] uppercase text-[10px] z-10">
              <tr>
                <th className="p-2 border-r border-[#45483f]">PATIENT ID</th>
                <th className="p-2 border-r border-[#45483f]">TRIAGE</th>
                <th className="p-2 border-r border-[#45483f] text-center">HR</th>
                <th className="p-2 border-r border-[#45483f] text-center">SPO2</th>
                <th className="p-2 border-r border-[#45483f] text-center">BP</th>
                <th className="p-2 border-r border-[#45483f] text-center">RR</th>
                <th className="p-2 border-r border-[#45483f]">CLINICAL PRESENTATION</th>
                <th className="p-2 border-r border-[#45483f]">STATUS</th>
                <th className="p-2">REVIEW</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#45483f] text-[#e0e4dc]">
              {sortedPatients.map((patient) => {
                const isSelected = patient.id === activePatient?.id;
                const isCrit = patient.triagePriority === 'CRITICAL';
                const isPrio = patient.triagePriority === 'PRIORITY';

                return (
                  <tr
                    key={patient.id}
                    onClick={() => handleSelectPatient(patient)}
                    className={`cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-[#596447]/30 border-l-4 border-[#bfcba8]' 
                        : 'hover:bg-[#272b26] border-l-4 border-transparent'
                    }`}
                  >
                    <td className="p-2 border-r border-[#45483f] whitespace-nowrap font-bold">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 ${isCrit ? 'bg-[#ffb4ab]' : isPrio ? 'bg-[#d2c6a4]' : 'bg-[#bfcba8]'}`} />
                        <span>{patient.id}</span>
                        {patient.callsign && (
                          <span className="text-[10px] text-[#909287]">({patient.callsign})</span>
                        )}
                      </div>
                    </td>
                    <td className="p-2 border-r border-[#45483f] whitespace-nowrap">
                      <span className={`px-1 py-0.5 text-[9px] font-bold ${
                        isCrit ? 'bg-[#93000a] text-[#ffdad6] border border-[#ffb4ab]/50' :
                        isPrio ? 'bg-[#51482f] text-[#c4b897] border border-[#d2c6a4]/50' :
                        'bg-[#2a341b] text-[#d4e0bc] border border-[#bfcba8]/50'
                      }`}>
                        {patient.triagePriority}
                      </span>
                    </td>
                    <td className={`p-2 border-r border-[#45483f] text-center font-bold ${patient.heartRate > 120 || patient.heartRate < 50 ? 'text-[#ffb4ab]' : ''}`}>
                      {patient.heartRate}
                    </td>
                    <td className={`p-2 border-r border-[#45483f] text-center font-bold ${patient.spO2 < 90 ? 'text-[#ffb4ab]' : ''}`}>
                      {patient.spO2}%
                    </td>
                    <td className="p-2 border-r border-[#45483f] text-center text-[#c6c7bc]">
                      {patient.systolicBP}/{patient.diastolicBP}
                    </td>
                    <td className="p-2 border-r border-[#45483f] text-center">
                      {patient.respiratoryRate}
                    </td>
                    <td className="p-2 border-r border-[#45483f] text-xs font-['IBM_Plex_Sans'] truncate max-w-xs">
                      {patient.injurySummary}
                    </td>
                    <td className="p-2 border-r border-[#45483f] whitespace-nowrap text-[10px]">
                      <span className="px-1 bg-[#191d18] border border-[#45483f] text-[#c6c7bc]">
                        {patient.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-2 whitespace-nowrap text-[10px]">
                      <span className={`px-1 font-bold ${
                        patient.reviewStatus === 'VERIFIED' ? 'text-[#bfcba8]' :
                        patient.reviewStatus === 'OVERRIDDEN' ? 'text-[#d2c6a4]' : 'text-[#ffb4ab]'
                      }`}>
                        {patient.reviewStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Casualty Dossier & Telemetry Detail View */}
        {activePatient && (
          <div className="lg:w-96 bg-[#191d18] flex flex-col p-3 overflow-y-auto custom-scroll border-t lg:border-t-0 border-[#45483f] select-none">
            {/* Dossier Header */}
            <div className="border-b border-[#45483f] pb-2 mb-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-['IBM_Plex_Sans'] text-lg font-bold text-[#e0e4dc]">
                      DOSSIER: {activePatient.id}
                    </span>
                    <span className={`px-1 text-[10px] font-['Space_Mono'] font-bold ${
                      activePatient.triagePriority === 'CRITICAL' ? 'bg-[#93000a] text-[#ffdad6]' :
                      activePatient.triagePriority === 'PRIORITY' ? 'bg-[#51482f] text-[#c4b897]' :
                      'bg-[#2a341b] text-[#d4e0bc]'
                    }`}>
                      {activePatient.triagePriority}
                    </span>
                  </div>
                  <div className="font-['Space_Mono'] text-xs text-[#909287] mt-0.5">
                    {activePatient.callsign} // {activePatient.incidentId}
                  </div>
                </div>

                <button
                  onClick={() => setIsMedevacModalOpen(true)}
                  className="bg-[#596447] text-[#d4e0bc] hover:bg-[#bfcba8] hover:text-[#2a341b] border border-[#bfcba8]/50 px-2 py-1 font-['Space_Mono'] text-[10px] uppercase font-bold"
                >
                  DISPATCH EVAC
                </button>
              </div>

              <div className="font-['IBM_Plex_Sans'] text-xs text-[#e0e4dc] mt-2 p-2 bg-[#1d211c] border border-[#45483f]">
                {activePatient.injurySummary}
              </div>
            </div>

            {/* Vital Signs Grid */}
            <div className="mb-3">
              <span className="font-['Space_Mono'] text-[10px] text-[#909287] block mb-1 uppercase font-bold">
                STREAMED VITALS:
              </span>
              <div className="grid grid-cols-4 gap-1 bg-[#0b0f0b] p-2 border border-[#45483f] font-['Space_Mono'] text-center">
                <div className="p-1 bg-[#191d18]">
                  <span className="text-[9px] text-[#909287] block">HR</span>
                  <span className={`text-base font-bold ${activePatient.heartRate > 120 || activePatient.heartRate < 50 ? 'text-[#ffb4ab]' : 'text-[#e0e4dc]'}`}>
                    {activePatient.heartRate}
                  </span>
                </div>
                <div className="p-1 bg-[#191d18]">
                  <span className="text-[9px] text-[#909287] block">SPO2</span>
                  <span className={`text-base font-bold ${activePatient.spO2 < 90 ? 'text-[#ffb4ab]' : 'text-[#e0e4dc]'}`}>
                    {activePatient.spO2}%
                  </span>
                </div>
                <div className="p-1 bg-[#191d18]">
                  <span className="text-[9px] text-[#909287] block">BP</span>
                  <span className="text-base font-bold text-[#e0e4dc]">
                    {activePatient.systolicBP}/{activePatient.diastolicBP}
                  </span>
                </div>
                <div className="p-1 bg-[#191d18]">
                  <span className="text-[9px] text-[#909287] block">RESP</span>
                  <span className="text-base font-bold text-[#e0e4dc]">
                    {activePatient.respiratoryRate}
                  </span>
                </div>
              </div>
            </div>

            {/* Historical Trend Chart (SVG sparkline) */}
            <div className="mb-3 p-2 bg-[#0b0f0b] border border-[#45483f]">
              <div className="flex justify-between items-center text-[10px] font-['Space_Mono'] text-[#909287] mb-1">
                <span>VITAL TRENDS (LAST OBSERVATIONS)</span>
                <span className="text-[#bfcba8]">HR / SPO2</span>
              </div>
              <div className="h-20 w-full relative">
                {activePatient.observationHistory.length > 1 ? (
                  <svg className="w-full h-full" viewBox="0 0 200 80" preserveAspectRatio="none">
                    {/* HR Line (Red/Amber) */}
                    <polyline
                      fill="none"
                      stroke="#ffb4ab"
                      strokeWidth="2"
                      points={activePatient.observationHistory.map((obs, idx) => {
                        const x = (idx / (activePatient.observationHistory.length - 1)) * 190 + 5;
                        const y = 75 - ((obs.heartRate - 40) / 140) * 70;
                        return `${x},${Math.max(5, Math.min(75, y))}`;
                      }).join(' ')}
                    />
                    {/* SpO2 Line (Green/Lime) */}
                    <polyline
                      fill="none"
                      stroke="#bfcba8"
                      strokeWidth="2"
                      strokeDasharray="3 2"
                      points={activePatient.observationHistory.map((obs, idx) => {
                        const x = (idx / (activePatient.observationHistory.length - 1)) * 190 + 5;
                        const y = 75 - ((obs.spO2 - 70) / 30) * 70;
                        return `${x},${Math.max(5, Math.min(75, y))}`;
                      }).join(' ')}
                    />
                  </svg>
                ) : (
                  <div className="flex items-center justify-center h-full text-[10px] font-['Space_Mono'] text-[#909287]">
                    Monitoring initialized. Awaiting secondary readings.
                  </div>
                )}
              </div>
              <div className="flex justify-between text-[9px] font-['Space_Mono'] text-[#909287] mt-1">
                <span>Oldest</span>
                <span className="text-[#ffb4ab]">─ HR</span>
                <span className="text-[#bfcba8]">┄ SpO2</span>
                <span>Current</span>
              </div>
            </div>

            {/* Explainable Triage Rules Breakdown */}
            <div className="mb-3 p-2 bg-[#1d211c] border border-[#45483f]">
              <span className="font-['Space_Mono'] text-[10px] text-[#bfcba8] block mb-1 uppercase font-bold">
                EXPLAINABLE TRIAGE PROTOCOL:
              </span>
              <div className="text-xs font-['IBM_Plex_Sans'] text-[#e0e4dc]">
                {activePatient.triageExplanation}
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {activePatient.triageRuleHits.map(rId => (
                  <span key={rId} className="px-1 py-0.5 bg-[#0b0f0b] border border-[#45483f] font-['Space_Mono'] text-[9px] text-[#d2c6a4]">
                    HIT: {rId}
                  </span>
                ))}
              </div>
            </div>

            {/* Clinical Certification & Reviewer Override */}
            <div className="mb-3 p-2 bg-[#0b0f0b] border border-[#45483f] space-y-2">
              <span className="font-['Space_Mono'] text-[10px] text-[#d2c6a4] block uppercase font-bold">
                CLINICAL TRIAGE CERTIFICATION
              </span>
              <div className="flex items-center justify-between text-xs font-['Space_Mono']">
                <span className="text-[#909287]">Status:</span>
                <span className="text-[#bfcba8] font-bold">{activePatient.reviewStatus}</span>
              </div>
              {activePatient.reviewedBy && (
                <div className="flex items-center justify-between text-[10px] font-['Space_Mono'] text-[#c6c7bc]">
                  <span className="text-[#909287]">Certified By:</span>
                  <span>{activePatient.reviewedBy} at {activePatient.reviewedAt}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <select
                  value={overridePri}
                  onChange={(e) => setOverridePri(e.target.value as any)}
                  className="bg-[#191d18] border border-[#45483f] text-[#e0e4dc] p-1 font-['Space_Mono'] text-xs flex-1 outline-hidden"
                >
                  <option value="">Keep Rule Triage</option>
                  <option value="CRITICAL">Override: CRITICAL / RED</option>
                  <option value="PRIORITY">Override: PRIORITY / AMBER</option>
                  <option value="STABLE">Override: STABLE / GREEN</option>
                </select>

                <button
                  onClick={handleVerify}
                  className="px-2.5 py-1 bg-[#596447] text-[#d4e0bc] hover:bg-[#bfcba8] hover:text-[#2a341b] font-['Space_Mono'] text-xs font-bold uppercase transition-colors"
                >
                  Certify
                </button>
              </div>
            </div>

            {/* Operational Status Transitions */}
            <div className="mb-3 p-2 bg-[#1d211c] border border-[#45483f]">
              <span className="font-['Space_Mono'] text-[10px] text-[#909287] block mb-1 uppercase font-bold">
                OPERATIONAL EVACUATION STATUS:
              </span>
              <div className="grid grid-cols-2 gap-1 font-['Space_Mono'] text-[10px]">
                {(['WAITING_TRIAGE', 'TRIAGED', 'EVAC_PENDING', 'EN_ROUTE', 'DELIVERED'] as PatientStatus[]).map(st => (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(st)}
                    className={`p-1 border text-center transition-colors ${
                      activePatient.status === st 
                        ? 'bg-[#596447] text-[#d4e0bc] border-[#bfcba8] font-bold' 
                        : 'bg-[#191d18] text-[#c6c7bc] border-[#45483f] hover:border-[#909287]'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Telemetry Injector Slider Controls */}
            <div className="p-2 bg-[#0b0f0b] border border-[#45483f] space-y-2">
              <span className="font-['Space_Mono'] text-[10px] text-[#bfcba8] block uppercase font-bold">
                MANUAL TELEMETRY INJECTOR:
              </span>
              <div>
                <div className="flex justify-between text-[9px] font-['Space_Mono'] text-[#909287]">
                  <span>HEART RATE</span>
                  <span className="text-[#e0e4dc] font-bold">{adjHR || activePatient.heartRate} BPM</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="180"
                  value={adjHR || activePatient.heartRate}
                  onChange={(e) => setAdjHR(parseInt(e.target.value))}
                  className="w-full accent-[#bfcba8]"
                />
              </div>

              <div>
                <div className="flex justify-between text-[9px] font-['Space_Mono'] text-[#909287]">
                  <span>SPO2 OXYGENATION</span>
                  <span className="text-[#e0e4dc] font-bold">{adjSpO2 || activePatient.spO2}%</span>
                </div>
                <input
                  type="range"
                  min="70"
                  max="100"
                  value={adjSpO2 || activePatient.spO2}
                  onChange={(e) => setAdjSpO2(parseInt(e.target.value))}
                  className="w-full accent-[#bfcba8]"
                />
              </div>

              <button
                onClick={handleApplyVitals}
                className="w-full py-1 bg-[#323630] hover:bg-[#596447] text-[#d4e0bc] font-['Space_Mono'] text-xs font-bold uppercase transition-colors"
              >
                Apply Telemetry Update
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
