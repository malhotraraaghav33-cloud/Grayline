import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export const OfflineSyncScreen: React.FC = () => {
  const { 
    isOnline, 
    toggleMockOffline, 
    syncQueue, 
    forceSyncMesh, 
    lastSyncTime,
    patients,
    hazards 
  } = useApp();

  const [cacheDetailsOpen, setCacheDetailsOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#101410] overflow-hidden select-none">
      {/* Top Header */}
      <div className="p-2 border-b border-[#45483f] bg-[#1d211c] flex flex-wrap justify-between items-center gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#bfcba8]">sync_saved_locally</span>
          <div>
            <span className="font-['IBM_Plex_Sans'] text-base font-bold text-[#e0e4dc] uppercase block">
              TACTICAL MESH & OFFLINE PERSISTENCE CENTER
            </span>
            <span className="font-['Space_Mono'] text-[10px] text-[#909287]">
              INDEXEDDB STORAGE // AIR-GAPPED DISASTER SYNCHRONIZATION PROTOCOL
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleMockOffline}
            className={`px-3 py-1 font-['Space_Mono'] text-xs uppercase font-bold border transition-colors flex items-center gap-1 ${
              isOnline 
                ? 'bg-[#272b26] text-[#c6c7bc] border-[#45483f] hover:text-[#e0e4dc]' 
                : 'bg-[#93000a] text-[#ffdad6] border-[#ffb4ab]'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">
              {isOnline ? 'wifi' : 'wifi_off'}
            </span>
            {isOnline ? 'SIMULATE DISCONNECT' : 'RESTORE LINK (ONLINE)'}
          </button>

          <button
            onClick={forceSyncMesh}
            className="px-3 py-1 bg-[#596447] text-[#d4e0bc] hover:bg-[#bfcba8] hover:text-[#2a341b] border border-[#bfcba8]/50 font-['Space_Mono'] text-xs uppercase font-bold flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">cloud_sync</span>
            FORCE MESH SYNC
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 overflow-y-auto custom-scroll space-y-4 max-w-4xl mx-auto w-full font-['Space_Mono'] text-xs">
        {/* Status Hero Card */}
        <div className={`p-4 border-2 ${isOnline ? 'border-[#bfcba8] bg-[#191d18]' : 'border-[#ffb4ab] bg-[#93000a]/20'} space-y-2`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${isOnline ? 'bg-[#bfcba8] animate-pulse' : 'bg-[#ffb4ab]'}`} />
              <span className="text-base font-bold text-[#e0e4dc] uppercase">
                {isOnline ? 'TACTICAL MESH LINK: ARMED & SYNCHRONIZED' : 'AIR-GAPPED OFFLINE DEMO MODE'}
              </span>
            </div>
            <span className={`px-2 py-0.5 text-xs font-bold border ${
              isOnline ? 'bg-[#2a341b] text-[#d4e0bc] border-[#bfcba8]' : 'bg-[#93000a] text-[#ffdad6] border-[#ffb4ab]'
            }`}>
              {isOnline ? 'ONLINE' : 'LOCAL CACHE ONLY'}
            </span>
          </div>

          <p className="font-['IBM_Plex_Sans'] text-sm text-[#c6c7bc] leading-relaxed">
            {isOnline 
              ? 'Tactical data store is actively synchronized with the local IndexedDB database and persistent mesh relay. All patient observations, triage audits, and hazard records are cached client-side for zero-latency operations.'
              : 'The terminal is disconnected from remote telemetry relays. All vital modifications, medevac dispatches, and hazard updates are queued in the local offline transaction ledger and will persist across page reloads.'
            }
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#45483f] text-center">
            <div className="p-2 bg-[#0b0f0b] border border-[#45483f]">
              <span className="text-[9px] text-[#909287] block uppercase">Pending In Queue</span>
              <span className="text-lg font-bold text-[#e0e4dc]">{syncQueue.length} Trans</span>
            </div>
            <div className="p-2 bg-[#0b0f0b] border border-[#45483f]">
              <span className="text-[9px] text-[#909287] block uppercase">Cached Casualties</span>
              <span className="text-lg font-bold text-[#bfcba8]">{patients.length} Records</span>
            </div>
            <div className="p-2 bg-[#0b0f0b] border border-[#45483f]">
              <span className="text-[9px] text-[#909287] block uppercase">Cached Hazards</span>
              <span className="text-lg font-bold text-[#d2c6a4]">{hazards.length} Records</span>
            </div>
            <div className="p-2 bg-[#0b0f0b] border border-[#45483f]">
              <span className="text-[9px] text-[#909287] block uppercase">Last Sync Timestamp</span>
              <span className="text-xs font-bold text-[#e0e4dc] mt-1 block">{lastSyncTime}</span>
            </div>
          </div>
        </div>

        {/* Offline Limitations & Protocol Explanations */}
        <div className="p-3 bg-[#1d211c] border border-[#45483f] space-y-2">
          <span className="text-xs text-[#d2c6a4] font-bold uppercase block">
            OFFLINE INTEGRATION ARCHITECTURE & LIMITATIONS
          </span>
          <div className="font-['IBM_Plex_Sans'] text-xs text-[#c6c7bc] space-y-1.5 leading-relaxed">
            <p>
              • <strong>Local-First Persistence:</strong> Primary operational store resides in browser IndexedDB (object store: <code className="text-[#bfcba8]">tactical_state</code>) with fallback to LocalStorage.
            </p>
            <p>
              • <strong>Air-Gap Resilience:</strong> When offline, the app avoids failed remote RPC requests and buffers mutations locally in a sequential FIFO queue.
            </p>
            <p>
              • <strong>Honest Status Notice:</strong> In this local defense demonstration mode, no fictitious remote cloud sync is simulated; all records are explicitly designated as locally stored until a network gateway is confirmed.
            </p>
          </div>
        </div>

        {/* Pending Sync Queue Table */}
        <div className="p-3 bg-[#1d211c] border border-[#45483f] space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-[#bfcba8] font-bold uppercase">
              LOCAL PENDING SYNCHRONIZATION QUEUE [{syncQueue.length}]
            </span>
            {syncQueue.length > 0 && (
              <span className="text-[10px] text-[#ffb4ab]">Awaiting Network Handshake</span>
            )}
          </div>

          {syncQueue.length > 0 ? (
            <div className="space-y-1.5 max-h-60 overflow-y-auto custom-scroll">
              {syncQueue.map((item, idx) => (
                <div key={item.id} className="p-2 bg-[#0b0f0b] border border-[#45483f] flex justify-between items-center text-[11px]">
                  <div>
                    <span className="text-[#bfcba8] font-bold">{idx + 1}. {item.action}</span>
                    <span className="text-[#909287] ml-2">Target: {item.targetId}</span>
                    <div className="text-[9px] text-[#c6c7bc] mt-0.5">
                      Data: {JSON.stringify(item.data)}
                    </div>
                  </div>
                  <div className="text-right text-[10px]">
                    <span className="px-1.5 py-0.5 bg-[#51482f] text-[#c4b897] font-bold">
                      {item.status}
                    </span>
                    <div className="text-[#909287] mt-0.5">{item.queuedAt}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-[#909287] bg-[#0b0f0b] border border-[#45483f]">
              <span className="material-symbols-outlined text-2xl mb-1 text-[#bfcba8] block">check_circle</span>
              All local mutations synchronized with tactical database. Queue is clear.
            </div>
          )}
        </div>

        {/* Cache Inspection */}
        <div className="p-3 bg-[#1d211c] border border-[#45483f] space-y-2">
          <button
            onClick={() => setCacheDetailsOpen(!cacheDetailsOpen)}
            className="flex items-center justify-between w-full text-xs font-bold text-[#e0e4dc] uppercase"
          >
            <span>INSPECT LOCAL DATABASE STORAGE OBJECTS</span>
            <span className="text-[#bfcba8]">{cacheDetailsOpen ? '▲ Collapse' : '▼ Expand'}</span>
          </button>

          {cacheDetailsOpen && (
            <div className="pt-2 border-t border-[#45483f] space-y-2 text-[11px]">
              <div className="bg-[#0b0f0b] p-2 border border-[#45483f] text-[#c6c7bc]">
                <div className="font-bold text-[#bfcba8] mb-1">IndexedDB Diagnostic Status:</div>
                <div>Database Name: GraylineTacticalDB (Version 1)</div>
                <div>Active Object Store: tactical_state</div>
                <div>Storage Engine: Native Browser IDBStore + LocalStorage fallback</div>
                <div>Records Preserved: {patients.length} patients, {hazards.length} hazards</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
