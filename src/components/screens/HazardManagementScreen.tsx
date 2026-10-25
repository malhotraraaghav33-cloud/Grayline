import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Hazard } from '../../types';

export const HazardManagementScreen: React.FC = () => {
  const { 
    hazards, 
    verifyHazard, 
    resolveHazard, 
    setIsNewHazardModalOpen, 
    selectedHazardId, 
    setSelectedHazardId,
    setActiveTab 
  } = useApp();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ACTIVE');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const filteredHazards = hazards.filter(h => {
    const matchesSearch = 
      h.title.toLowerCase().includes(search.toLowerCase()) ||
      h.code.toLowerCase().includes(search.toLowerCase()) ||
      h.locationDescription.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || h.status === statusFilter;
    const matchesSeverity = severityFilter === 'ALL' || h.severity === severityFilter;
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const activeHazard = hazards.find(h => h.id === selectedHazardId) || hazards[0];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#101410] overflow-hidden select-none">
      {/* Top Header */}
      <div className="p-2 border-b border-[#45483f] bg-[#1d211c] flex flex-wrap justify-between items-center gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#d2c6a4]">warning</span>
          <div>
            <span className="font-['IBM_Plex_Sans'] text-base font-bold text-[#e0e4dc] uppercase block">
              SECTOR HAZARD & ARTERIAL OBSTACLE REGISTRY
            </span>
            <span className="font-['Space_Mono'] text-[10px] text-[#909287]">
              DYNAMIC ROADBLOCK TRACKING // AUTOMATIC GRAPH ROUTING INTEGRATION
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2 top-1.5 text-[16px] text-[#909287]">
              search
            </span>
            <input
              type="text"
              placeholder="Search hazards..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#191d18] border border-[#45483f] text-[#e0e4dc] pl-7 pr-2 py-1 font-['Space_Mono'] text-xs w-44 focus:border-[#d2c6a4] outline-hidden"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-[#191d18] border border-[#45483f] text-[#e0e4dc] px-2 py-1 font-['Space_Mono'] text-xs outline-hidden"
          >
            <option value="ACTIVE">ACTIVE ONLY</option>
            <option value="ALL">ALL HAZARDS</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>

          <button
            onClick={() => setIsNewHazardModalOpen(true)}
            className="px-3 py-1 bg-[#51482f] text-[#efe2bf] hover:bg-[#d2c6a4] hover:text-[#211b06] border border-[#d2c6a4] font-['Space_Mono'] text-xs uppercase font-bold tracking-wider transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">add_circle</span>
            LOG NEW HAZARD
          </button>
        </div>
      </div>

      {/* Main 2-Pane Split: Hazard Cards (65%) & Selected Inspector (35%) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Hazards List */}
        <div className="flex-1 p-3 overflow-y-auto custom-scroll space-y-3">
          <div className="space-y-2.5">
            {filteredHazards.map(hazard => {
              const isSelected = hazard.id === activeHazard?.id;
              const isHigh = hazard.severity === 'HIGH';
              const isVerified = hazard.verificationStatus === 'VERIFIED';
              const isResolved = hazard.status === 'RESOLVED';

              return (
                <div
                  key={hazard.id}
                  onClick={() => setSelectedHazardId(hazard.id)}
                  className={`p-3 border transition-all cursor-pointer relative ${
                    isSelected ? 'bg-[#1d211c] border-[#d2c6a4]' : 'bg-[#191d18] border-[#45483f] hover:border-[#909287]'
                  }`}
                >
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${
                    isResolved ? 'bg-[#45483f]' : isHigh ? 'bg-[#ffb4ab]' : 'bg-[#d2c6a4]'
                  }`} />

                  {/* Top Bar */}
                  <div className="pl-2 border-b border-[#45483f] pb-2 flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-['Space_Mono'] text-xs font-bold text-[#d2c6a4]">
                          {hazard.code}
                        </span>
                        <span className="font-['IBM_Plex_Sans'] text-base font-bold text-[#e0e4dc]">
                          {hazard.title}
                        </span>
                      </div>
                      <div className="font-['Space_Mono'] text-[10px] text-[#909287] mt-0.5">
                        LOCATION: {hazard.locationDescription}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 text-[9px] font-['Space_Mono'] font-bold border ${
                        isVerified 
                          ? 'bg-[#2a341b] text-[#d4e0bc] border-[#bfcba8]' 
                          : 'bg-[#51482f] text-[#c4b897] border-[#d2c6a4]'
                      }`}>
                        {hazard.verificationStatus}
                      </span>

                      <span className={`px-1.5 py-0.5 text-[9px] font-['Space_Mono'] font-bold border ${
                        isResolved ? 'bg-[#272b26] text-[#909287] border-[#45483f]' :
                        isHigh ? 'bg-[#93000a] text-[#ffdad6] border-[#ffb4ab]' :
                        'bg-[#51482f] text-[#c4b897] border-[#d2c6a4]'
                      }`}>
                        {hazard.status} // {hazard.severity}
                      </span>
                    </div>
                  </div>

                  {/* Body description */}
                  <div className="pl-2 py-2 font-['IBM_Plex_Sans'] text-xs text-[#c6c7bc] leading-relaxed">
                    {hazard.description}
                  </div>

                  {/* Footer status & Actions */}
                  <div className="pl-2 pt-2 border-t border-[#45483f] flex flex-wrap justify-between items-center text-[10px] font-['Space_Mono'] text-[#909287] gap-2">
                    <div>
                      {hazard.blocksRoadId ? (
                        <span className="text-[#ffb4ab] font-bold">
                          ⛔ CLOSES ROAD: {hazard.blocksRoadId}
                        </span>
                      ) : (
                        <span>ADVISORY / NON-BLOCKING</span>
                      )}
                      <span className="ml-2">REPORTED: {hazard.reportedTimestamp}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!isVerified && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            verifyHazard(hazard.id, 'RECON 2 TEAM');
                          }}
                          className="px-2 py-0.5 bg-[#2a341b] hover:bg-[#596447] text-[#d4e0bc] border border-[#bfcba8] font-bold uppercase transition-colors"
                        >
                          Verify Intel
                        </button>
                      )}

                      {!isResolved && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            resolveHazard(hazard.id);
                          }}
                          className="px-2 py-0.5 bg-[#272b26] hover:bg-[#323630] text-[#bfcba8] border border-[#45483f] font-bold uppercase transition-colors"
                        >
                          Mark Cleared
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hazard Detail Inspector Rail */}
        {activeHazard && (
          <div className="lg:w-96 border-t lg:border-t-0 lg:border-l border-[#45483f] bg-[#191d18] p-3 overflow-y-auto custom-scroll shrink-0 space-y-3 font-['Space_Mono'] text-xs">
            <div className="border-b border-[#45483f] pb-2">
              <span className="text-[10px] text-[#909287] uppercase block font-bold">SELECTED HAZARD</span>
              <div className="font-['IBM_Plex_Sans'] text-lg font-bold text-[#e0e4dc] mt-0.5">
                {activeHazard.code}: {activeHazard.title}
              </div>
              <div className="text-xs text-[#d2c6a4] mt-0.5">
                GRID: {activeHazard.lat.toFixed(4)}°N, {activeHazard.lng.toFixed(4)}°W (Radius: {activeHazard.radiusMeters}m)
              </div>
            </div>

            {/* Impact on Dijkstra Routing Engine */}
            <div className="p-2.5 bg-[#0b0f0b] border border-[#45483f] space-y-1.5">
              <span className="text-[10px] text-[#bfcba8] uppercase font-bold block">
                CORRIDOR ROUTING IMPACT
              </span>
              <div className="text-xs text-[#e0e4dc]">
                {activeHazard.blocksRoadId ? (
                  <div>
                    <span className="text-[#ffb4ab] font-bold block mb-1">
                      ROAD SEGMENT CLOSED: {activeHazard.blocksRoadId}
                    </span>
                    <p className="font-['IBM_Plex_Sans'] text-xs text-[#c6c7bc]">
                      Dijkstra algorithm automatically penalizes this segment to Infinity. Evacuation convoys are rerouted through alternate bypass roads.
                    </p>
                  </div>
                ) : (
                  <p className="font-['IBM_Plex_Sans'] text-xs text-[#c6c7bc]">
                    Advisory hazard. Road segments remain open at reduced speed limits.
                  </p>
                )}
              </div>
            </div>

            {/* Recon & Clearance Timeline */}
            <div className="p-2.5 bg-[#1d211c] border border-[#45483f] space-y-2">
              <span className="text-[10px] text-[#909287] uppercase font-bold block">
                INTELLIGENCE TIMELINE
              </span>
              <div className="space-y-1 text-[11px] text-[#c6c7bc]">
                <div className="flex justify-between">
                  <span>Reported:</span>
                  <span className="text-[#e0e4dc]">{activeHazard.reportedTimestamp}</span>
                </div>
                <div className="flex justify-between">
                  <span>Verification:</span>
                  <span className={activeHazard.verificationStatus === 'VERIFIED' ? 'text-[#bfcba8]' : 'text-[#d2c6a4]'}>
                    {activeHazard.verificationStatus} {activeHazard.verifiedBy ? `(${activeHazard.verifiedBy})` : ''}
                  </span>
                </div>
                {activeHazard.estimatedClearHours && (
                  <div className="flex justify-between">
                    <span>Est. Clearance Time:</span>
                    <span className="text-[#e0e4dc]">{activeHazard.estimatedClearHours} Hours</span>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation jump */}
            <button
              onClick={() => setActiveTab('evac')}
              className="w-full py-2 bg-[#596447] text-[#d4e0bc] hover:bg-[#bfcba8] hover:text-[#2a341b] border border-[#bfcba8]/50 uppercase font-bold tracking-wider transition-colors flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">alt_route</span>
              INSPECT EVAC ROUTE AROUND THIS HAZARD
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
