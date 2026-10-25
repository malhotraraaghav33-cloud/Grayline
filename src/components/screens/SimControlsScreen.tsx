import React from 'react';
import { useApp } from '../../context/AppContext';

export const SimControlsScreen: React.FC = () => {
  const { 
    isSimulationRunning, 
    simulationSpeed, 
    simulationTicks, 
    lastSimUpdate, 
    startSimulation, 
    pauseSimulation, 
    resetSimulation, 
    setSimulationSpeed,
    mascalActive,
    setMascalActive,
    addTimelineEvent,
    updatePatient,
    backendStatus,
    wsConnected,
    inferenceStatus,
    refreshBackendData,
  } = useApp();

  // Trauma Scenario Presets
  const handleTriggerScenario = (type: 'ARTILLERY' | 'BLAST' | 'HYPOTHERMIA') => {
    if (type === 'ARTILLERY') {
      ['P-101', 'P-106', 'P-110'].forEach(pId => {
        updatePatient(pId, {
          heartRate: 135,
          spO2: 87,
          systolicBP: 85,
          respiratoryRate: 29
        });
      });
      addTimelineEvent({
        category: 'SIM',
        title: 'Trauma Scenario Injected: Shrapnel Cluster',
        detail: 'Simulated influx of 3 high-acuity casualties with thoracic and blast trauma.',
        severity: 'CRITICAL'
      });
    } else if (type === 'BLAST') {
      updatePatient('P-112', {
        heartRate: 38,
        systolicBP: 70,
        gcs: 5
      });
      addTimelineEvent({
        category: 'SIM',
        title: 'Scenario Injected: Blast Decompensation',
        detail: 'Casualty P-112 vitals deteriorated into severe bradycardic collapse.',
        severity: 'CRITICAL',
        patientId: 'P-112'
      });
    } else if (type === 'HYPOTHERMIA') {
      updatePatient('P-116', {
        temperature: 32.5,
        heartRate: 46,
        spO2: 89
      });
      addTimelineEvent({
        category: 'SIM',
        title: 'Scenario Injected: Severe Submersion Hypothermia',
        detail: 'Casualty P-116 core temperature dropped to 32.5°C; rewarming required.',
        severity: 'WARNING',
        patientId: 'P-116'
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#101410] overflow-hidden select-none font-['Space_Mono'] text-xs">
      {/* Top Header */}
      <div className="p-2 border-b border-[#45483f] bg-[#1d211c] flex flex-wrap justify-between items-center gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#bfcba8]">tune</span>
          <div>
            <span className="font-['IBM_Plex_Sans'] text-base font-bold text-[#e0e4dc] uppercase block">
              SIMULATION ENGINE CONTROLLER & SCENARIO LAB
            </span>
            <span className="text-[10px] text-[#909287]">
              CONTROL TELEMETRY FREQUENCY // INJECT EXERCISE ANOMALIES
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[#909287]">LAST SIM TICK:</span>
          <span className="text-[#bfcba8] font-bold">{lastSimUpdate}</span>
          <span className="text-[#45483f]">|</span>
          <span className="text-[#909287]">TOTAL TICKS:</span>
          <span className="text-[#e0e4dc] font-bold">{simulationTicks}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 overflow-y-auto custom-scroll space-y-4 max-w-4xl mx-auto w-full">
        {/* Backend & GPU-Ready Architecture Panel */}
        <div className="p-4 bg-[#191d18] border border-[#45483f] space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-[#e0e4dc] uppercase flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#bfcba8] text-[18px]">dns</span>
              BACKEND API & INFERENCE ARCHITECTURE (GPU DECOUPLED)
            </span>
            <button
              onClick={() => refreshBackendData()}
              className="text-[10px] text-[#bfcba8] hover:text-[#e0e4dc] px-2 py-0.5 border border-[#45483f] bg-[#252a23] uppercase"
            >
              PING BACKEND
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="p-2.5 bg-[#0b0f0b] border border-[#45483f]">
              <span className="text-[#909287] block text-[9px] uppercase">FASTAPI SERVICE</span>
              <span className="font-bold text-[#83a17a] flex items-center gap-1 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${backendStatus === 'online' ? 'bg-[#83a17a]' : 'bg-[#c6534d]'}`}></span>
                {backendStatus === 'online' ? 'PORT 8001 ONLINE' : 'OFFLINE / LOCAL FALLBACK'}
              </span>
              <span className="text-[9px] text-[#909287] block mt-1">PostgreSQL & SQLite Storage</span>
            </div>

            <div className="p-2.5 bg-[#0b0f0b] border border-[#45483f]">
              <span className="text-[#909287] block text-[9px] uppercase">REALTIME WEBSOCKET</span>
              <span className="font-bold text-[#bfcba8] flex items-center gap-1 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-[#83a17a]' : 'bg-[#d4a44d]'}`}></span>
                {wsConnected ? 'LIVE WS BROADCAST' : 'POLLING FALLBACK ACTIVE'}
              </span>
              <span className="text-[9px] text-[#909287] block mt-1">Telemetry & Casualty Events</span>
            </div>

            <div className="p-2.5 bg-[#0b0f0b] border border-[#45483f]">
              <span className="text-[#909287] block text-[9px] uppercase">INFERENCE SERVICE</span>
              <span className="font-bold text-[#d2c6a4] flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-[13px] text-[#d2c6a4]">memory</span>
                {inferenceStatus?.status || 'DETERMINISTIC FALLBACK'}
              </span>
              <span className="text-[9px] text-[#909287] block mt-1">{inferenceStatus?.provider || 'CPU Rule Catalog (Uncertified Demo)'}</span>
            </div>
          </div>

          <div className="text-[10px] text-[#c6c7bc] bg-[#252a23] p-2 border border-[#45483f]">
            <strong className="text-[#d2c6a4]">Decoupled Inference Policy:</strong> GRAYLINE operates with 100% deterministic, explainable clinical rules. No patient telemetry is sent to 3rd-party LLMs. GPU acceleration endpoint is configurable via <code className="text-[#bfcba8]">INFERENCE_SERVICE_URL</code> and remains unvalidated until formally evaluated.
          </div>
        </div>

        {/* Core Simulation Transport Controls */}
        <div className="p-4 bg-[#191d18] border-2 border-[#45483f] space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-[#e0e4dc] uppercase">
              SIMULATION ENGINE RUNTIME
            </span>
            <span className={`px-2 py-0.5 text-xs font-bold border ${
              isSimulationRunning 
                ? 'bg-[#2a341b] text-[#d4e0bc] border-[#bfcba8] animate-pulse' 
                : 'bg-[#51482f] text-[#c4b897] border-[#d2c6a4]'
            }`}>
              {isSimulationRunning ? 'RUNNING' : 'PAUSED'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isSimulationRunning ? (
              <button
                onClick={pauseSimulation}
                className="px-4 py-2 bg-[#51482f] text-[#efe2bf] hover:bg-[#d2c6a4] hover:text-[#211b06] border border-[#d2c6a4] uppercase font-bold flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">pause</span>
                PAUSE SIMULATION
              </button>
            ) : (
              <button
                onClick={startSimulation}
                className="px-4 py-2 bg-[#596447] text-[#d4e0bc] hover:bg-[#bfcba8] hover:text-[#2a341b] border border-[#bfcba8] uppercase font-bold flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                START / RESUME
              </button>
            )}

            <button
              onClick={resetSimulation}
              className="px-4 py-2 bg-[#272b26] hover:bg-[#323630] border border-[#45483f] text-[#e0e4dc] uppercase font-bold flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              RESET DEMO SCENARIO
            </button>
          </div>

          {/* Speed Multiplier */}
          <div className="pt-2 border-t border-[#45483f]">
            <span className="text-[10px] text-[#909287] block uppercase mb-1">
              TELEMETRY GENERATION SPEED MULTIPLIER:
            </span>
            <div className="grid grid-cols-4 gap-2">
              {[0.5, 1, 2, 5].map(spd => (
                <button
                  key={spd}
                  onClick={() => setSimulationSpeed(spd)}
                  className={`py-1.5 border text-center font-bold uppercase transition-colors ${
                    simulationSpeed === spd 
                      ? 'bg-[#596447] text-[#d4e0bc] border-[#bfcba8]' 
                      : 'bg-[#0b0f0b] text-[#c6c7bc] border-[#45483f] hover:border-[#909287]'
                  }`}
                >
                  {spd}x SPEED
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mass Casualty Posture Escalation */}
        <div className="p-4 bg-[#191d18] border border-[#ffb4ab]/40 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-[#ffb4ab] uppercase">
              MASCAL (MASS CASUALTY) CRISIS PROTOCOL
            </span>
            <span className={`px-2 py-0.5 text-xs font-bold border ${
              mascalActive ? 'bg-[#93000a] text-[#ffdad6] border-[#ffb4ab]' : 'bg-[#272b26] text-[#909287] border-[#45483f]'
            }`}>
              {mascalActive ? 'ACTIVE' : 'STANDBY'}
            </span>
          </div>
          <p className="font-['IBM_Plex_Sans'] text-xs text-[#c6c7bc]">
            Declaring MASCAL accelerates priority triage reassessment and directs aeromedical evacuation rotor corridors.
          </p>
          <button
            onClick={() => setMascalActive(!mascalActive)}
            className={`px-4 py-2 border font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
              mascalActive
                ? 'bg-[#272b26] text-[#bfcba8] border-[#bfcba8]'
                : 'bg-[#93000a] text-[#ffdad6] border-[#ffb4ab] hover:bg-[#ffb4ab] hover:text-[#690005]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">e911_emergency</span>
            {mascalActive ? 'STAND DOWN MASCAL' : 'DECLARE MASCAL'}
          </button>
        </div>

        {/* Pre-Packaged Tactical Trauma Scenarios */}
        <div className="p-4 bg-[#191d18] border border-[#45483f] space-y-3">
          <span className="text-sm font-bold text-[#d2c6a4] uppercase block">
            DEMONSTRATION TRAUMA SCENARIO INJECTORS
          </span>
          <p className="font-['IBM_Plex_Sans'] text-xs text-[#c6c7bc]">
            Instantly simulate real-time battlefield telemetry shocks to demonstrate rule-based triage elevation and rerouting reactions:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <button
              onClick={() => handleTriggerScenario('ARTILLERY')}
              className="p-3 bg-[#0b0f0b] border border-[#45483f] hover:border-[#ffb4ab] text-left transition-colors group"
            >
              <div className="font-bold text-[#ffb4ab] text-xs uppercase mb-1">
                💥 ARTILLERY SURGE
              </div>
              <div className="text-[10px] text-[#909287] font-['IBM_Plex_Sans']">
                Triggers 3 severe thoracic & shock casualties at Orchard Junction.
              </div>
            </button>

            <button
              onClick={() => handleTriggerScenario('BLAST')}
              className="p-3 bg-[#0b0f0b] border border-[#45483f] hover:border-[#ffb4ab] text-left transition-colors group"
            >
              <div className="font-bold text-[#ffb4ab] text-xs uppercase mb-1">
                💣 P-112 COLLAPSE
              </div>
              <div className="text-[10px] text-[#909287] font-['IBM_Plex_Sans']">
                Forces profound bradycardia (HR 38) and coma (GCS 5) on Casualty P-112.
              </div>
            </button>

            <button
              onClick={() => handleTriggerScenario('HYPOTHERMIA')}
              className="p-3 bg-[#0b0f0b] border border-[#45483f] hover:border-[#d2c6a4] text-left transition-colors group"
            >
              <div className="font-bold text-[#d2c6a4] text-xs uppercase mb-1">
                ❄️ CREEK HYPOTHERMIA
              </div>
              <div className="text-[10px] text-[#909287] font-['IBM_Plex_Sans']">
                Simulates cold-water exposure drop (32.5°C) requiring aid station diversion.
              </div>
            </button>
          </div>
        </div>

        {/* Fictional Exercise Context Notice */}
        <div className="p-3 bg-[#0b0f0b] border border-[#45483f] text-[10px] text-[#909287] space-y-1">
          <div className="text-[#bfcba8] font-bold uppercase">
            REGULATORY & DEMO BOUNDARY CERTIFICATION:
          </div>
          <div>
            1. All physiological telemetry streams (HR, SpO2, NIBP, RR) are simulated values bounded by clinical models.
          </div>
          <div>
            2. This interface is engineered for tactical triage demonstrations and defense logistics hackathon evaluation.
          </div>
          <div>
            3. No actual patient data or live DoD/military installations are accessed or depicted.
          </div>
        </div>
      </div>
    </div>
  );
};
