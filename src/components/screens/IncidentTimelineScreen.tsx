import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export const IncidentTimelineScreen: React.FC = () => {
  const { timeline, exportSITREPCSV } = useApp();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const filteredEvents = timeline.filter(evt => {
    const matchesSearch = 
      evt.title.toLowerCase().includes(search.toLowerCase()) ||
      evt.detail.toLowerCase().includes(search.toLowerCase()) ||
      (evt.patientId && evt.patientId.toLowerCase().includes(search.toLowerCase())) ||
      (evt.facilityId && evt.facilityId.toLowerCase().includes(search.toLowerCase())) ||
      (evt.hazardId && evt.hazardId.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = categoryFilter === 'ALL' || evt.category === categoryFilter;
    const matchesSeverity = severityFilter === 'ALL' || evt.severity === severityFilter;

    return matchesSearch && matchesCategory && matchesSeverity;
  });

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#101410] overflow-hidden select-none">
      {/* Top Header */}
      <div className="p-2 border-b border-[#45483f] bg-[#1d211c] flex flex-wrap justify-between items-center gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#bfcba8]">history</span>
          <div>
            <span className="font-['IBM_Plex_Sans'] text-base font-bold text-[#e0e4dc] uppercase block">
              TACTICAL INCIDENT & TELEMETRY TIMELINE LOG
            </span>
            <span className="font-['Space_Mono'] text-[10px] text-[#909287]">
              CHRONOLOGICAL AUDIT TRAIL // {timeline.length} RECORDED EVENTS
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2 top-1.5 text-[16px] text-[#909287]">
              search
            </span>
            <input
              type="text"
              placeholder="Filter timeline events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#191d18] border border-[#45483f] text-[#e0e4dc] pl-7 pr-2 py-1 font-['Space_Mono'] text-xs w-48 focus:border-[#bfcba8] outline-hidden"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#191d18] border border-[#45483f] text-[#e0e4dc] px-2 py-1 font-['Space_Mono'] text-xs outline-hidden"
          >
            <option value="ALL">ALL CATEGORIES</option>
            <option value="TRIAGE">TRIAGE</option>
            <option value="VITALS">VITALS</option>
            <option value="HAZARD">HAZARD</option>
            <option value="FACILITY">FACILITY</option>
            <option value="EVAC">EVAC</option>
            <option value="SIM">SIMULATION</option>
            <option value="SYSTEM">SYSTEM</option>
            <option value="MASCAL">MASCAL</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-[#191d18] border border-[#45483f] text-[#e0e4dc] px-2 py-1 font-['Space_Mono'] text-xs outline-hidden"
          >
            <option value="ALL">ALL SEVERITIES</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="WARNING">WARNING</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="INFO">INFO</option>
          </select>

          <button
            onClick={exportSITREPCSV}
            className="px-2.5 py-1 bg-[#323630] hover:bg-[#596447] text-[#d4e0bc] border border-[#45483f] font-['Space_Mono'] text-xs uppercase font-bold flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">download</span>
            Export CSV
          </button>
        </div>
      </div>

      {/* Events Stream List */}
      <div className="flex-1 p-3 overflow-y-auto custom-scroll space-y-2">
        {filteredEvents.length > 0 ? (
          filteredEvents.map(evt => {
            const isCrit = evt.severity === 'CRITICAL';
            const isWarn = evt.severity === 'WARNING';
            const isSucc = evt.severity === 'SUCCESS';

            const borderCol = isCrit ? 'border-[#ffb4ab]' : isWarn ? 'border-[#d2c6a4]' : isSucc ? 'border-[#bfcba8]' : 'border-[#45483f]';
            const textCol = isCrit ? 'text-[#ffb4ab]' : isWarn ? 'text-[#d2c6a4]' : isSucc ? 'text-[#bfcba8]' : 'text-[#e0e4dc]';

            return (
              <div 
                key={evt.id}
                className={`p-2.5 bg-[#191d18] border ${borderCol} flex flex-col sm:flex-row sm:items-start justify-between gap-2 shadow-xs`}
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-['Space_Mono'] text-xs text-[#909287]">
                      {evt.zuluTime}
                    </span>
                    <span className={`px-1.5 py-0.5 text-[9px] font-['Space_Mono'] font-bold border ${
                      isCrit ? 'bg-[#93000a] text-[#ffdad6] border-[#ffb4ab]' :
                      isWarn ? 'bg-[#51482f] text-[#c4b897] border-[#d2c6a4]' :
                      'bg-[#272b26] text-[#bfcba8] border-[#45483f]'
                    }`}>
                      {evt.category}
                    </span>
                    <span className={`font-['Space_Mono'] text-xs font-bold ${textCol}`}>
                      {evt.title}
                    </span>
                  </div>

                  <div className="font-['IBM_Plex_Sans'] text-xs text-[#c6c7bc] pl-0 sm:pl-2">
                    {evt.detail}
                  </div>
                </div>

                <div className="flex items-center gap-2 font-['Space_Mono'] text-[10px] text-[#909287] shrink-0">
                  {evt.patientId && (
                    <span className="px-1.5 py-0.5 bg-[#0b0f0b] border border-[#45483f] text-[#bfcba8]">
                      ID: {evt.patientId}
                    </span>
                  )}
                  {evt.hazardId && (
                    <span className="px-1.5 py-0.5 bg-[#0b0f0b] border border-[#45483f] text-[#d2c6a4]">
                      HAZ: {evt.hazardId}
                    </span>
                  )}
                  {evt.facilityId && (
                    <span className="px-1.5 py-0.5 bg-[#0b0f0b] border border-[#45483f] text-[#bfcba8]">
                      FAC: {evt.facilityId}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-[#909287] font-['Space_Mono'] text-xs">
            No incident log events match current search and category criteria.
          </div>
        )}
      </div>
    </div>
  );
};
