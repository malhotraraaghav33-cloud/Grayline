import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MedicalFacility } from '../../types';

export const MedicalFacilitiesScreen: React.FC = () => {
  const { 
    facilities, 
    selectedFacilityId, 
    setSelectedFacilityId, 
    setIsMedevacModalOpen, 
    patients 
  } = useApp();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const filteredFacilities = facilities.filter(f => {
    const matchesSearch = 
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.code.toLowerCase().includes(search.toLowerCase()) ||
      f.id.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'ALL' || f.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const activeFacility = facilities.find(f => f.id === selectedFacilityId) || facilities[0];

  // Assigned casualties to active facility
  const assignedPatients = patients.filter(p => p.assignedFacilityId === activeFacility.id);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#101410] overflow-hidden select-none">
      {/* Top Header */}
      <div className="p-2 border-b border-[#45483f] bg-[#1d211c] flex flex-wrap justify-between items-center gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#bfcba8]">local_hospital</span>
          <div>
            <span className="font-['IBM_Plex_Sans'] text-base font-bold text-[#e0e4dc] uppercase block">
              MEDICAL FACILITIES SURGE & CAPACITY MONITOR
            </span>
            <span className="font-['Space_Mono'] text-[10px] text-[#909287]">
              SECTOR 4 REGIONAL TRAUMA NETWORK // CRITICAL CARE INTAKE
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
              placeholder="Search facility..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#191d18] border border-[#45483f] text-[#e0e4dc] pl-7 pr-2 py-1 font-['Space_Mono'] text-xs w-44 focus:border-[#bfcba8] outline-hidden"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#191d18] border border-[#45483f] text-[#e0e4dc] px-2 py-1 font-['Space_Mono'] text-xs outline-hidden"
          >
            <option value="ALL">ALL TYPES</option>
            <option value="FORWARD_SURGICAL">FORWARD SURGICAL</option>
            <option value="REGIONAL_TRAUMA">REGIONAL TRAUMA</option>
            <option value="CLINIC">CLINIC / AID STATION</option>
            <option value="AUXILIARY_DEPOT">AUXILIARY DEPOT</option>
          </select>
        </div>
      </div>

      {/* Main Content Split: Facility Cards Grid (65%) & Facility Inspector (35%) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Facilities Grid */}
        <div className="flex-1 p-3 overflow-y-auto custom-scroll space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredFacilities.map(facility => {
              const isSelected = facility.id === activeFacility.id;
              const capPercent = Math.round((facility.occupiedBeds / facility.totalCapacity) * 100);
              const freeBeds = facility.totalCapacity - facility.occupiedBeds;
              const isSurge = capPercent >= 80;
              const isCritical = capPercent >= 95;

              return (
                <div
                  key={facility.id}
                  onClick={() => setSelectedFacilityId(facility.id)}
                  className={`bg-[#191d18] border p-3 cursor-pointer transition-all relative ${
                    isSelected 
                      ? 'border-[#bfcba8] bg-[#1d211c]' 
                      : 'border-[#45483f] hover:border-[#909287]'
                  }`}
                >
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${
                    isCritical ? 'bg-[#ffb4ab]' : isSurge ? 'bg-[#d2c6a4]' : 'bg-[#bfcba8]'
                  }`} />

                  {/* Header */}
                  <div className="pl-2 border-b border-[#45483f] pb-2 flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-['Space_Mono'] text-xs text-[#bfcba8] font-bold">
                          {facility.id}
                        </span>
                        <span className="font-['IBM_Plex_Sans'] text-base font-bold text-[#e0e4dc]">
                          {facility.name}
                        </span>
                      </div>
                      <div className="font-['Space_Mono'] text-[10px] text-[#909287] mt-0.5">
                        TYPE: {facility.type.replace('_', ' ')} // {facility.code}
                      </div>
                    </div>

                    <span className={`px-1.5 py-0.5 text-[9px] font-['Space_Mono'] font-bold border ${
                      isCritical ? 'bg-[#93000a] text-[#ffdad6] border-[#ffb4ab]' :
                      isSurge ? 'bg-[#51482f] text-[#c4b897] border-[#d2c6a4]' :
                      'bg-[#2a341b] text-[#d4e0bc] border-[#bfcba8]'
                    }`}>
                      {capPercent}% CAP
                    </span>
                  </div>

                  {/* Capacity Bar */}
                  <div className="pl-2 py-2.5">
                    <div className="flex justify-between font-['Space_Mono'] text-xs mb-1">
                      <span className="text-[#909287]">BED OCCUPANCY</span>
                      <span className="text-[#e0e4dc] font-bold">
                        {facility.occupiedBeds} / {facility.totalCapacity} ({freeBeds} FREE)
                      </span>
                    </div>
                    <div className="w-full bg-[#323630] h-3 border border-[#45483f] overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          isCritical ? 'bg-[#ffb4ab]' : isSurge ? 'bg-[#d2c6a4]' : 'bg-[#bfcba8]'
                        }`}
                        style={{ width: `${Math.min(100, capPercent)}%` }}
                      />
                    </div>
                  </div>

                  {/* Resources Matrix */}
                  <div className="pl-2 grid grid-cols-3 gap-1 text-center font-['Space_Mono'] text-[11px] bg-[#0b0f0b] p-1.5 border border-[#45483f]">
                    <div>
                      <span className="text-[9px] text-[#909287] block">ICU BEDS</span>
                      <span className="font-bold text-[#e0e4dc]">
                        {facility.icuOccupied} / {facility.icuCapacity}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#909287] block">SURG THEATERS</span>
                      <span className="font-bold text-[#e0e4dc]">
                        {facility.surgicalTheaters} ACTIVE
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#909287] block">BLOOD UNITS</span>
                      <span className="font-bold text-[#bfcba8]">
                        {facility.bloodUnitsAvailable} U
                      </span>
                    </div>
                  </div>

                  {/* Footer status */}
                  <div className="pl-2 pt-2 flex justify-between items-center text-[10px] font-['Space_Mono'] text-[#909287]">
                    <span className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${facility.receivingStatus ? 'bg-[#bfcba8]' : 'bg-[#ffb4ab]'}`} />
                      {facility.receivingStatus ? 'RECEIVING CASUALTIES' : 'DIVERT / AT CAPACITY'}
                    </span>
                    <span>UPDATED: {facility.lastUpdated}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Facility Inspector Rail */}
        {activeFacility && (
          <div className="lg:w-96 border-t lg:border-t-0 lg:border-l border-[#45483f] bg-[#191d18] p-3 overflow-y-auto custom-scroll shrink-0 space-y-3 font-['Space_Mono'] text-xs">
            <div className="border-b border-[#45483f] pb-2">
              <span className="text-[10px] text-[#909287] uppercase block font-bold">SELECTED FACILITY</span>
              <div className="font-['IBM_Plex_Sans'] text-lg font-bold text-[#e0e4dc] mt-0.5">
                {activeFacility.name}
              </div>
              <div className="text-xs text-[#bfcba8]">
                COORDINATES: {activeFacility.lat.toFixed(4)}°N, {activeFacility.lng.toFixed(4)}°W
              </div>
            </div>

            {/* Specialization & Services */}
            <div className="bg-[#1d211c] p-2.5 border border-[#45483f] space-y-1.5">
              <span className="text-[10px] text-[#d2c6a4] uppercase font-bold block">
                CLINICAL CAPABILITIES & SPECIALTIES
              </span>
              <div className="space-y-1">
                {activeFacility.specialties.map((spec, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-xs text-[#e0e4dc]">
                    <span className="text-[#bfcba8]">✓</span>
                    <span>{spec}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Inbound & Assigned Casualties */}
            <div className="bg-[#1d211c] p-2.5 border border-[#45483f] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[#bfcba8] uppercase font-bold">
                  ASSIGNED INBOUND CASUALTIES [{assignedPatients.length}]
                </span>
              </div>

              {assignedPatients.length > 0 ? (
                <div className="space-y-1 max-h-48 overflow-y-auto custom-scroll">
                  {assignedPatients.map(p => (
                    <div key={p.id} className="p-1.5 bg-[#0b0f0b] border border-[#45483f] text-[11px] flex justify-between items-center">
                      <div>
                        <span className="font-bold text-[#e0e4dc]">{p.id}</span>
                        <span className="text-[#909287] ml-1">({p.triagePriority})</span>
                        <div className="text-[9px] text-[#c6c7bc]">{p.assignedTransport || 'EN ROUTE'}</div>
                      </div>
                      <span className={`px-1 text-[9px] font-bold ${
                        p.triagePriority === 'CRITICAL' ? 'text-[#ffb4ab]' : 'text-[#d2c6a4]'
                      }`}>
                        HR {p.heartRate} // {p.spO2}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-[#909287] p-2 text-center bg-[#0b0f0b] border border-[#45483f]">
                  No casualties currently routed to this station.
                </div>
              )}
            </div>

            {/* Action Trigger */}
            <button
              onClick={() => setIsMedevacModalOpen(true)}
              className="w-full py-2 bg-[#596447] text-[#d4e0bc] hover:bg-[#bfcba8] hover:text-[#2a341b] border border-[#bfcba8]/50 uppercase font-bold tracking-wider transition-colors flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">flight_takeoff</span>
              ROUTE CASUALTY TO THIS FACILITY
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
