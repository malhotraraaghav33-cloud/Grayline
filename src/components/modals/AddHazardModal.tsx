import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { HazardCategory, HazardSeverity } from '../../types';

export const AddHazardModal: React.FC = () => {
  const { 
    isNewHazardModalOpen, 
    setIsNewHazardModalOpen, 
    addHazard, 
    roadEdges 
  } = useApp();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<HazardCategory>('DEBRIS');
  const [severity, setSeverity] = useState<HazardSeverity>('MEDIUM');
  const [locationDescription, setLocationDescription] = useState('Sector 4 Access Route');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState('34.2150');
  const [lng, setLng] = useState('-118.4600');
  const [blocksRoadId, setBlocksRoadId] = useState('');

  if (!isNewHazardModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addHazard({
      title: title.trim(),
      category,
      severity,
      locationDescription: locationDescription.trim(),
      description: description.trim() || 'Tactical obstacle reported by field scout.',
      lat: parseFloat(lat) || 34.2150,
      lng: parseFloat(lng) || -118.4600,
      blocksRoadId: blocksRoadId || undefined,
      verificationStatus: 'UNVERIFIED'
    });

    setIsNewHazardModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="bg-[#1d211c] border-2 border-[#d2c6a4] max-w-lg w-full p-4 relative shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#45483f] pb-2">
          <div className="flex items-center gap-2 text-[#d2c6a4]">
            <span className="material-symbols-outlined text-[24px]">warning</span>
            <span className="font-['IBM_Plex_Sans'] text-lg font-bold tracking-wider uppercase">
              LOG NEW SECTOR HAZARD
            </span>
          </div>
          <button 
            onClick={() => setIsNewHazardModalOpen(false)}
            className="text-[#909287] hover:text-[#e0e4dc] font-bold text-lg"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="py-3 space-y-3 font-['Space_Mono'] text-xs">
          <div>
            <label className="text-[#909287] block mb-1 uppercase font-bold">Hazard Title / Designation:</label>
            <input
              type="text"
              required
              placeholder="e.g. Unexploded Ordnance on North Ridge"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#191d18] border border-[#45483f] text-[#e0e4dc] p-2 focus:border-[#d2c6a4] outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[#909287] block mb-1 uppercase font-bold">Category:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as HazardCategory)}
                className="w-full bg-[#191d18] border border-[#45483f] text-[#e0e4dc] p-2 focus:border-[#d2c6a4] outline-hidden"
              >
                <option value="STRUCTURAL">STRUCTURAL</option>
                <option value="DEBRIS">DEBRIS</option>
                <option value="HAZMAT">HAZMAT</option>
                <option value="FLOOD">FLOOD</option>
                <option value="POWER_GRID">POWER GRID</option>
                <option value="HOSTILE_ACTION">HOSTILE ACTION</option>
              </select>
            </div>

            <div>
              <label className="text-[#909287] block mb-1 uppercase font-bold">Severity Level:</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as HazardSeverity)}
                className="w-full bg-[#191d18] border border-[#45483f] text-[#e0e4dc] p-2 focus:border-[#d2c6a4] outline-hidden"
              >
                <option value="HIGH">HIGH (Impassable / Critical)</option>
                <option value="MEDIUM">MEDIUM (Restricted)</option>
                <option value="LOW">LOW (Advisory)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[#909287] block mb-1 uppercase font-bold">Location Description:</label>
            <input
              type="text"
              value={locationDescription}
              onChange={(e) => setLocationDescription(e.target.value)}
              className="w-full bg-[#191d18] border border-[#45483f] text-[#e0e4dc] p-2 focus:border-[#d2c6a4] outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[#909287] block mb-1 uppercase font-bold">Latitude (°N):</label>
              <input
                type="text"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="w-full bg-[#191d18] border border-[#45483f] text-[#e0e4dc] p-2 focus:border-[#d2c6a4] outline-hidden"
              />
            </div>
            <div>
              <label className="text-[#909287] block mb-1 uppercase font-bold">Longitude (°W):</label>
              <input
                type="text"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="w-full bg-[#191d18] border border-[#45483f] text-[#e0e4dc] p-2 focus:border-[#d2c6a4] outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="text-[#909287] block mb-1 uppercase font-bold">Blocks Road Segment (Affects Dijkstra):</label>
            <select
              value={blocksRoadId}
              onChange={(e) => setBlocksRoadId(e.target.value)}
              className="w-full bg-[#191d18] border border-[#45483f] text-[#e0e4dc] p-2 focus:border-[#d2c6a4] outline-hidden"
            >
              <option value="">-- None (Does not close road segment) --</option>
              {roadEdges.map(r => (
                <option key={r.id} value={r.id}>
                  {r.id}: {r.name} ({r.distanceKm} km, {r.surfaceType})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[#909287] block mb-1 uppercase font-bold">Intel / Recon Description:</label>
            <textarea
              rows={2}
              placeholder="Provide field observations and clearance estimates..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#191d18] border border-[#45483f] text-[#e0e4dc] p-2 focus:border-[#d2c6a4] outline-hidden"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-[#45483f] pt-3">
            <button
              type="button"
              onClick={() => setIsNewHazardModalOpen(false)}
              className="px-4 py-1.5 bg-[#272b26] text-[#c6c7bc] hover:text-[#e0e4dc] border border-[#45483f] font-['Space_Mono'] text-xs uppercase"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#51482f] text-[#efe2bf] hover:bg-[#d2c6a4] hover:text-[#211b06] border border-[#d2c6a4] font-['Space_Mono'] text-xs uppercase font-bold tracking-wider transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">add_circle</span>
              LOG HAZARD RECORD
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
