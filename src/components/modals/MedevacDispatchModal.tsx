import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export const MedevacDispatchModal: React.FC = () => {
  const { 
    isMedevacModalOpen, 
    setIsMedevacModalOpen, 
    patients, 
    facilities, 
    selectedPatientId,
    assignPatientEvac,
    calculateRoute 
  } = useApp();

  const [patientId, setPatientId] = useState<string>(selectedPatientId || 'P-104');
  const [facilityId, setFacilityId] = useState<string>('MED-01');
  const [transport, setTransport] = useState<string>('AIR-EVAC (ROTOR-01)');

  if (!isMedevacModalOpen) return null;

  const currentPatient = patients.find(p => p.id === patientId) || patients[0];
  const targetFacility = facilities.find(f => f.id === facilityId) || facilities[0];

  // Route calculation
  const originNode = currentPatient.id === 'P-112' ? 'CAS-112' : 'CAS-104';
  const route = calculateRoute(originNode, targetFacility.id, true);

  const handleDispatch = () => {
    assignPatientEvac(currentPatient.id, targetFacility.id, transport);
    setIsMedevacModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="bg-[#1d211c] border-2 border-[#bfcba8] max-w-xl w-full p-4 relative shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#45483f] pb-2">
          <div className="flex items-center gap-2 text-[#bfcba8]">
            <span className="material-symbols-outlined text-[24px]">helicopter</span>
            <span className="font-['IBM_Plex_Sans'] text-lg font-bold tracking-wider uppercase">
              TACTICAL MEDEVAC DISPATCH ORDER
            </span>
          </div>
          <button 
            onClick={() => setIsMedevacModalOpen(false)}
            className="text-[#909287] hover:text-[#e0e4dc] font-bold text-lg"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="py-3 space-y-3 font-['Space_Mono'] text-xs">
          {/* Patient Selector */}
          <div>
            <label className="text-[#909287] block mb-1 uppercase font-bold">1. Target Casualty:</label>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full bg-[#191d18] border border-[#45483f] text-[#e0e4dc] p-2 focus:border-[#bfcba8] outline-hidden"
            >
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.id} [{p.triagePriority}] — {p.injurySummary.slice(0, 45)}... (HR {p.heartRate}, SpO2 {p.spO2}%)
                </option>
              ))}
            </select>
          </div>

          {/* Vitals summary box */}
          {currentPatient && (
            <div className="bg-[#191d18] p-2.5 border border-[#45483f] grid grid-cols-4 gap-2 text-center">
              <div>
                <span className="text-[#909287] block text-[9px]">HR / BPM</span>
                <span className={`font-bold text-sm ${currentPatient.heartRate > 120 || currentPatient.heartRate < 50 ? 'text-[#ffb4ab]' : 'text-[#e0e4dc]'}`}>
                  {currentPatient.heartRate}
                </span>
              </div>
              <div>
                <span className="text-[#909287] block text-[9px]">SPO2</span>
                <span className={`font-bold text-sm ${currentPatient.spO2 < 90 ? 'text-[#ffb4ab]' : 'text-[#e0e4dc]'}`}>
                  {currentPatient.spO2}%
                </span>
              </div>
              <div>
                <span className="text-[#909287] block text-[9px]">BP MMHG</span>
                <span className="text-[#e0e4dc] font-bold text-sm">
                  {currentPatient.systolicBP}/{currentPatient.diastolicBP}
                </span>
              </div>
              <div>
                <span className="text-[#909287] block text-[9px]">RESP / MIN</span>
                <span className={`font-bold text-sm ${currentPatient.respiratoryRate > 24 ? 'text-[#ffb4ab]' : 'text-[#e0e4dc]'}`}>
                  {currentPatient.respiratoryRate}
                </span>
              </div>
            </div>
          )}

          {/* Receiving Medical Facility */}
          <div>
            <label className="text-[#909287] block mb-1 uppercase font-bold">2. Receiving Medical Facility:</label>
            <select
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
              className="w-full bg-[#191d18] border border-[#45483f] text-[#e0e4dc] p-2 focus:border-[#bfcba8] outline-hidden"
            >
              {facilities.map(f => (
                <option key={f.id} value={f.id}>
                  {f.id}: {f.name} — {f.totalCapacity - f.occupiedBeds} beds free ({f.icuCapacity - f.icuOccupied} ICU) // {f.status}
                </option>
              ))}
            </select>
          </div>

          {/* Transport Method */}
          <div>
            <label className="text-[#909287] block mb-1 uppercase font-bold">3. Evacuation Platform / Asset:</label>
            <select
              value={transport}
              onChange={(e) => setTransport(e.target.value)}
              className="w-full bg-[#191d18] border border-[#45483f] text-[#e0e4dc] p-2 focus:border-[#bfcba8] outline-hidden"
            >
              <option value="AIR-EVAC (ROTOR-01)">AIR-EVAC: UH-60Q ROTOR-01 (Direct Flight, 6 Min ETA)</option>
              <option value="AIR-EVAC (ROTOR-02)">AIR-EVAC: CH-47 ROTOR-02 (Heavy Lift Multi-Stretcher)</option>
              <option value="GROUND CONVOY A">GROUND: Tactical Armored Ambulance Convoy Alfa</option>
              <option value="GROUND CONVOY B">GROUND: Fast Recon Ambulance Bravo</option>
            </select>
          </div>

          {/* Routing Intel derivation */}
          <div className="bg-[#0b0f0b] p-2.5 border border-[#45483f] text-[11px] text-[#c6c7bc] space-y-1">
            <div className="flex justify-between">
              <span className="text-[#909287]">GROUND DISTANCE:</span>
              <span className="text-[#bfcba8] font-bold">{route.totalDistanceKm} KM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#909287]">ESTIMATED GROUND TRANSIT:</span>
              <span className="text-[#bfcba8] font-bold">{route.estimatedTimeMinutes} MIN</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#909287]">AIR EVAC TRANSIT:</span>
              <span className="text-[#bfcba8] font-bold">~6 MIN (DIRECT)</span>
            </div>
            <div className="text-[10px] text-[#d2c6a4] pt-1 border-t border-[#45483f]">
              {route.explanation}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[#45483f] pt-3">
          <button
            onClick={() => setIsMedevacModalOpen(false)}
            className="px-4 py-1.5 bg-[#272b26] text-[#c6c7bc] hover:text-[#e0e4dc] border border-[#45483f] font-['Space_Mono'] text-xs uppercase"
          >
            Cancel
          </button>
          <button
            onClick={handleDispatch}
            className="px-4 py-1.5 bg-[#596447] text-[#d4e0bc] hover:bg-[#bfcba8] hover:text-[#2a341b] border border-[#bfcba8] font-['Space_Mono'] text-xs uppercase font-bold tracking-wider transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">send</span>
            CONFIRM DISPATCH ORDER
          </button>
        </div>
      </div>
    </div>
  );
};
