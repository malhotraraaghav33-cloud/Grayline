import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { TacticalMap } from '../map/TacticalMap';
import { runRoutingSelfTest } from '../../services/routingEngine';

export const EvacuationPlannerScreen: React.FC = () => {
  const { 
    roadNodes, 
    roadEdges, 
    graph, 
    calculateRoute, 
    toggleRoadBlocked,
    hazards,
    setIsMedevacModalOpen 
  } = useApp();

  const [originId, setOriginId] = useState<string>('CAS-104');
  const [destId, setDestId] = useState<string>('MED-01');
  const [avoidBlocked, setAvoidBlocked] = useState<boolean>(true);
  const [testResults, setTestResults] = useState<{ passed: boolean; results: any[] } | null>(null);

  // Calculate primary route using Dijkstra
  const primaryRoute = useMemo(() => {
    return calculateRoute(originId, destId, avoidBlocked);
  }, [originId, destId, avoidBlocked, calculateRoute]);

  // Calculate alternative unconstrained route for comparison (if primary route had to bypass blocked roads)
  const directUnconstrainedRoute = useMemo(() => {
    if (!avoidBlocked) return null;
    return calculateRoute(originId, destId, false);
  }, [originId, destId, avoidBlocked, calculateRoute]);

  const handleRunSelfTest = () => {
    const res = runRoutingSelfTest(graph);
    setTestResults(res);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#101410] overflow-hidden select-none">
      {/* Top Header */}
      <div className="p-2 border-b border-[#45483f] bg-[#1d211c] flex flex-wrap justify-between items-center gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#bfcba8]">explore</span>
          <div>
            <span className="font-['IBM_Plex_Sans'] text-base font-bold text-[#e0e4dc] uppercase block">
              TACTICAL EVACUATION ROUTE CALCULATION ENGINE
            </span>
            <span className="font-['Space_Mono'] text-[10px] text-[#909287]">
              GRAPH SOLVER: DIJKSTRA ARTERIAL ALGORITHM // HAZARD-AWARE CORRIDOR OPTIMIZATION
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunSelfTest}
            className="px-2.5 py-1 bg-[#272b26] hover:bg-[#323630] border border-[#bfcba8]/40 text-[#bfcba8] font-['Space_Mono'] text-xs uppercase flex items-center gap-1 font-bold"
          >
            <span className="material-symbols-outlined text-[14px]">rule</span>
            RUN ROUTER SELF-TEST
          </button>
          <button
            onClick={() => setIsMedevacModalOpen(true)}
            className="px-3 py-1 bg-[#596447] text-[#d4e0bc] hover:bg-[#bfcba8] hover:text-[#2a341b] border border-[#bfcba8]/50 font-['Space_Mono'] text-xs uppercase font-bold flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">helicopter</span>
            EXECUTE DISPATCH
          </button>
        </div>
      </div>

      {/* Main 2-Pane Split: Tactical Controls (40%) and Map Visualization (60%) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Controls and Corridor Breakdown */}
        <div className="lg:w-96 border-r border-[#45483f] bg-[#191d18] p-3 overflow-y-auto custom-scroll shrink-0 space-y-3">
          {/* Node Selectors */}
          <div className="bg-[#1d211c] p-2.5 border border-[#45483f] space-y-2 font-['Space_Mono'] text-xs">
            <span className="text-[#bfcba8] font-bold block uppercase text-[11px]">
              CORRIDOR PARAMETERS
            </span>

            <div>
              <label className="text-[#909287] block mb-1 uppercase text-[10px]">Origin Node (Casualty / Rally):</label>
              <select
                value={originId}
                onChange={(e) => setOriginId(e.target.value)}
                className="w-full bg-[#101410] border border-[#45483f] text-[#e0e4dc] p-1.5 focus:border-[#bfcba8] outline-hidden"
              >
                {roadNodes.map(node => (
                  <option key={node.id} value={node.id}>
                    {node.id}: {node.name} ({node.elevationMeters}m)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[#909287] block mb-1 uppercase text-[10px]">Destination Facility:</label>
              <select
                value={destId}
                onChange={(e) => setDestId(e.target.value)}
                className="w-full bg-[#101410] border border-[#45483f] text-[#e0e4dc] p-1.5 focus:border-[#bfcba8] outline-hidden"
              >
                {roadNodes.map(node => (
                  <option key={node.id} value={node.id}>
                    {node.id}: {node.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-1 flex items-center justify-between border-t border-[#45483f]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={avoidBlocked}
                  onChange={(e) => setAvoidBlocked(e.target.checked)}
                  className="accent-[#bfcba8]"
                />
                <span className="text-[11px] text-[#e0e4dc]">Enforce Hazard Roadblock Avoidance</span>
              </label>
            </div>
          </div>

          {/* Route Results Box */}
          <div className={`p-3 border ${primaryRoute.isViable ? 'border-[#bfcba8] bg-[#1d211c]' : 'border-[#ffb4ab] bg-[#93000a]/20'} font-['Space_Mono'] text-xs space-y-2`}>
            <div className="flex justify-between items-center border-b border-[#45483f] pb-1.5">
              <span className="font-bold text-[#e0e4dc] uppercase">
                {primaryRoute.isViable ? 'CORRIDOR STATUS: OPTIMAL' : 'CORRIDOR STATUS: IMPASSABLE'}
              </span>
              <span className={`px-1 text-[10px] font-bold ${primaryRoute.isViable ? 'bg-[#596447] text-[#d4e0bc]' : 'bg-[#93000a] text-[#ffdad6]'}`}>
                {primaryRoute.isViable ? 'GROUND VIABLE' : 'NO ROUTE'}
              </span>
            </div>

            {primaryRoute.isViable ? (
              <>
                <div className="grid grid-cols-2 gap-2 text-center py-1">
                  <div className="p-2 bg-[#0b0f0b] border border-[#45483f]">
                    <span className="text-[9px] text-[#909287] block uppercase">Distance</span>
                    <span className="text-lg font-bold text-[#bfcba8]">{primaryRoute.totalDistanceKm} KM</span>
                  </div>
                  <div className="p-2 bg-[#0b0f0b] border border-[#45483f]">
                    <span className="text-[9px] text-[#909287] block uppercase">Est. Ground ETA</span>
                    <span className="text-lg font-bold text-[#bfcba8]">~{primaryRoute.estimatedTimeMinutes} MIN</span>
                  </div>
                </div>

                <div className="bg-[#0b0f0b] p-2 border border-[#45483f] font-['IBM_Plex_Sans'] text-xs text-[#e0e4dc]">
                  <strong className="text-[#d2c6a4] font-['Space_Mono'] block text-[10px] uppercase mb-0.5">
                    RATIONALE & SECTOR INTEL:
                  </strong>
                  {primaryRoute.explanation}
                </div>

                {primaryRoute.usedBypass && directUnconstrainedRoute && directUnconstrainedRoute.isViable && (
                  <div className="p-2 bg-[#51482f]/30 border border-[#d2c6a4]/50 text-[10px] text-[#d2c6a4]">
                    ⚠️ Alternative direct route would be {directUnconstrainedRoute.totalDistanceKm} km (~{directUnconstrainedRoute.estimatedTimeMinutes} min), but crosses blocked HWY 12 Bridge. Diverted safely via Bypass 4C.
                  </div>
                )}

                {/* Turn-by-Turn Segments */}
                <div>
                  <span className="text-[10px] text-[#909287] block uppercase mb-1">
                    WAYPOINT SEQUENCE [{primaryRoute.pathNodeIds.length} NODES]:
                  </span>
                  <div className="space-y-1">
                    {primaryRoute.pathNodeIds.map((nId, idx) => {
                      const node = roadNodes.find(n => n.id === nId);
                      return (
                        <div key={idx} className="flex items-center gap-1.5 text-[11px] text-[#c6c7bc]">
                          <span className="text-[#bfcba8] font-bold">{idx + 1}.</span>
                          <span className="text-[#e0e4dc] font-bold">{nId}</span>
                          <span className="text-[10px] text-[#909287]">({node?.name})</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-2 text-[#ffb4ab] text-xs">
                {primaryRoute.explanation}
              </div>
            )}
          </div>

          {/* Interactive Road Obstacle Simulator */}
          <div className="bg-[#1d211c] p-2.5 border border-[#45483f] space-y-2 font-['Space_Mono'] text-xs">
            <div className="flex justify-between items-center">
              <span className="text-[#d2c6a4] font-bold block uppercase text-[11px]">
                ROAD NETWORK SEGMENTS [{roadEdges.length}]
              </span>
              <span className="text-[10px] text-[#909287]">Click to toggle closure</span>
            </div>

            <div className="space-y-1 max-h-48 overflow-y-auto custom-scroll">
              {roadEdges.map(edge => (
                <div 
                  key={edge.id}
                  onClick={() => toggleRoadBlocked(edge.id)}
                  className={`p-1.5 border text-[11px] flex items-center justify-between cursor-pointer transition-colors ${
                    edge.isBlocked 
                      ? 'bg-[#93000a]/20 border-[#ffb4ab] text-[#ffb4ab]' 
                      : 'bg-[#101410] border-[#45483f] text-[#c6c7bc] hover:border-[#bfcba8]'
                  }`}
                >
                  <div>
                    <span className="font-bold block">{edge.name}</span>
                    <span className="text-[9px] text-[#909287]">
                      {edge.fromNodeId} ↔ {edge.toNodeId} ({edge.distanceKm} km, {edge.surfaceType})
                    </span>
                  </div>

                  <span className={`px-1 text-[9px] font-bold ${edge.isBlocked ? 'bg-[#93000a] text-[#ffdad6]' : 'bg-[#272b26] text-[#bfcba8]'}`}>
                    {edge.isBlocked ? 'BLOCKED' : 'OPEN'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Self Test Results Modal or Card */}
          {testResults && (
            <div className="bg-[#0b0f0b] p-2.5 border-2 border-[#bfcba8] space-y-2 font-['Space_Mono'] text-xs">
              <div className="flex justify-between items-center border-b border-[#45483f] pb-1">
                <span className="text-[#bfcba8] font-bold uppercase">
                  DIJKSTRA TEST SUITE: {testResults.passed ? 'ALL PASSED (3/3)' : 'FAILED'}
                </span>
                <button onClick={() => setTestResults(null)} className="text-[#909287]">✕</button>
              </div>
              <div className="space-y-1.5 text-[10px]">
                {testResults.results.map((t, idx) => (
                  <div key={idx} className="p-1.5 bg-[#191d18] border border-[#45483f]">
                    <div className="flex justify-between">
                      <span className="font-bold text-[#e0e4dc]">{t.testName}</span>
                      <span className={t.passed ? 'text-[#bfcba8] font-bold' : 'text-[#ffb4ab] font-bold'}>
                        {t.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                    <div className="text-[#909287] mt-0.5">{t.details}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tactical Map Display */}
        <div className="flex-1 h-full min-h-[350px] relative bg-[#0b0f0b]">
          <TacticalMap activeRoute={primaryRoute} />
        </div>
      </div>
    </div>
  );
};
