import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

export const TopHeader: React.FC<{ onToggleMobileMenu?: () => void }> = ({ onToggleMobileMenu }) => {
  const { 
    patients, 
    mascalActive, 
    setIsMascalModalOpen, 
    isOnline, 
    lastSyncTime,
    backendStatus,
    wsConnected,
    userRole,
    setUserRole,
  } = useApp();

  const [zuluTime, setZuluTime] = useState<string>('');
  const [showRoleMenu, setShowRoleMenu] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getUTCHours()).padStart(2, '0');
      const m = String(now.getUTCMinutes()).padStart(2, '0');
      const s = String(now.getUTCSeconds()).padStart(2, '0');
      setZuluTime(`${h}:${m}:${s} UTC`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const critCount = patients.filter(p => p.triagePriority === 'CRITICAL').length;
  const amberCount = patients.filter(p => p.triagePriority === 'PRIORITY').length;

  return (
    <header className="flex justify-between items-center w-full px-3 py-1.5 border-b border-[#45483f] bg-[#1d211c] shrink-0 z-50 select-none">
      {/* Left Segment: Identity & Scenario Context */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {onToggleMobileMenu && (
          <button 
            onClick={onToggleMobileMenu}
            className="md:hidden text-[#bfcba8] hover:text-[#e0e4dc] p-1"
            title="Toggle Menu"
          >
            <span className="material-symbols-outlined text-[20px]">menu</span>
          </button>
        )}
        <div className="flex items-center gap-1.5">
          <span 
            className="material-symbols-outlined text-[#bfcba8] text-[20px]" 
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            emergency
          </span>
          <span className="font-['IBM_Plex_Sans'] text-base font-semibold tracking-wider text-[#bfcba8] uppercase">
            GRAYLINE
          </span>
        </div>
        <div className="h-4 w-px bg-[#45483f]"></div>
        
        {/* Visible Demo Mode Badge */}
        <div className="flex items-center gap-1.5 font-['Space_Mono'] text-[10px] sm:text-[11px]">
          <span className="px-2 py-0.5 bg-[#323630] text-[#ffb4ab] border border-[#ffb4ab]/40 font-bold tracking-wider animate-pulse">
            DEMO MODE // SIMULATED
          </span>
          <span className="text-[#d2c6a4] opacity-75 hidden lg:inline">
            FIELD RESPONSE 07
          </span>
        </div>
      </div>

      {/* Center Segment: Telemetry & Network Heartbeat */}
      <div className="hidden xl:flex items-center gap-3 font-['Space_Mono'] text-[11px]">
        {/* Backend status indicator */}
        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[#171a16] border border-[#45483f] text-[#c6c7bc]">
          <span className={`w-2 h-2 rounded-full ${backendStatus === 'online' ? 'bg-[#83a17a]' : 'bg-[#c6534d]'}`}></span>
          <span>API: <strong className={backendStatus === 'online' ? 'text-[#83a17a]' : 'text-[#c6534d]'}>
            {backendStatus === 'online' ? 'FASTAPI (8001)' : 'OFFLINE'}
          </strong></span>
          <span className="text-[#45483f]">|</span>
          <span>WS: <strong className={wsConnected ? 'text-[#83a17a]' : 'text-[#d4a44d]'}>
            {wsConnected ? 'LIVE' : 'POLLING'}
          </strong></span>
        </div>

        <div className="flex items-center gap-1 text-[#c6c7bc]">
          <span className={`material-symbols-outlined text-[16px] ${isOnline ? 'text-[#bfcba9]' : 'text-[#ffb4ab]'}`}>
            {isOnline ? 'wifi_tethering' : 'wifi_off'}
          </span>
          <span>MESH: <span className={`${isOnline ? 'text-[#bfcba8]' : 'text-[#ffb4ab]'} font-bold`}>{isOnline ? '99.8%' : 'OFFLINE'}</span></span>
        </div>

        <div className="flex items-center gap-1 text-[#c6c7bc]">
          <span className="material-symbols-outlined text-[#909287] text-[16px]">schedule</span>
          <span>SYNC: <span className="text-[#e0e4dc]">{lastSyncTime}</span></span>
        </div>

        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[#93000a]/30 border border-[#ffb4ab]/40 text-[#ffb4ab]">
          <span className="material-symbols-outlined text-[14px]">warning</span>
          <span className="font-['Space_Mono'] text-[11px] font-bold">
            {critCount} CRIT / {amberCount} PRIO
          </span>
        </div>
      </div>

      {/* Right Segment: Role Switcher & Zulu Clock & Primary Trigger */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Security Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-1 font-['Space_Mono'] text-[10px] sm:text-[11px] border border-[#45483f] px-2 py-0.5 bg-[#252a23] hover:border-[#bfcba8] transition-colors"
            title="Click to switch security role"
          >
            <span className="material-symbols-outlined text-[#d2c6a4] text-[15px]">security</span>
            <span className="text-[#c6c7bc]">ROLE: <strong className="text-[#d2c6a4] uppercase">{userRole}</strong></span>
            <span className="material-symbols-outlined text-[12px] text-[#909287]">arrow_drop_down</span>
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-1 w-44 bg-[#1d211c] border border-[#45483f] shadow-xl z-50 font-['Space_Mono'] text-[11px]">
              <div className="px-2 py-1 bg-[#252a23] text-[#909287] text-[9px] uppercase border-b border-[#45483f]">
                Switch Security Role
              </div>
              {(['operator', 'admin', 'viewer'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => {
                    setUserRole(r);
                    setShowRoleMenu(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 hover:bg-[#323630] flex items-center justify-between ${
                    userRole === r ? 'text-[#bfcba8] font-bold bg-[#2d332a]' : 'text-[#c6c7bc]'
                  }`}
                >
                  <span className="uppercase">{r}</span>
                  {userRole === r && <span className="material-symbols-outlined text-[14px] text-[#bfcba8]">check</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Zulu Clock */}
        <div className="flex items-center gap-1 px-2 py-0.5 bg-[#0b0f0b] border border-[#45483f]">
          <span className="font-['Space_Mono'] text-[11px] text-[#bfcba8] font-bold tracking-widest">
            {zuluTime || '14:32:08 UTC'}
          </span>
        </div>

        {/* MASCAL Trigger Button */}
        <button 
          onClick={() => setIsMascalModalOpen(true)}
          className={`border px-2.5 sm:px-3 py-1 font-['Space_Mono'] text-[11px] uppercase tracking-wider transition-colors duration-150 flex items-center gap-1 font-bold ${
            mascalActive 
              ? 'bg-[#ffb4ab] text-[#690005] border-[#ffb4ab] animate-pulse'
              : 'bg-[#93000a] text-[#ffdad6] border-[#ffb4ab]/50 hover:bg-[#ffb4ab]/30 active:bg-[#93000a]'
          }`}
          title="Declare Mass Casualty Incident"
        >
          <span 
            className="material-symbols-outlined text-[14px]" 
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            e911_emergency
          </span>
          <span className="hidden xs:inline">
            {mascalActive ? 'MASCAL ACTIVE' : 'DECLARE MASCAL'}
          </span>
        </button>
      </div>
    </header>
  );
};
