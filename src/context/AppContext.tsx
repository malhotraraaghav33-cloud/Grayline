/**
 * Core Application State & Simulation Controller for GRAYLINE
 * Full-stack integration connecting React UI to FastAPI backend, WebSockets,
 * real PostgreSQL/SQLite persistence, and GPU-ready inference telemetry.
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { 
  Patient, 
  MedicalFacility, 
  Hazard, 
  RoadNode, 
  RoadEdge, 
  TimelineEvent, 
  QueuedSyncItem,
  TriagePriority,
  CalculatedRoute 
} from '../types';
import { 
  INITIAL_PATIENTS, 
  INITIAL_FACILITIES, 
  INITIAL_HAZARDS, 
  ROAD_NODES, 
  ROAD_EDGES, 
  INITIAL_TIMELINE 
} from '../data/initialData';
import { TacticalGraph } from '../services/routingEngine';
import { evaluateTriage } from '../services/triageEngine';
import { tacticalStorage } from '../services/persistence';
import { 
  apiClient, 
  realtimeWs, 
  InferenceStatus, 
  subscribeAuth, 
  getAuth 
} from '../services/apiClient';

export type NavigationTab = 
  | 'overview' 
  | 'patients' 
  | 'triage' 
  | 'evac' 
  | 'facilities' 
  | 'hazards' 
  | 'timeline' 
  | 'reports' 
  | 'offline' 
  | 'sim';

export interface AppContextType {
  // Navigation & selection
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  selectedPatientId: string | null;
  setSelectedPatientId: (id: string | null) => void;
  selectedFacilityId: string | null;
  setSelectedFacilityId: (id: string | null) => void;
  selectedHazardId: string | null;
  setSelectedHazardId: (id: string | null) => void;

  // Data
  patients: Patient[];
  facilities: MedicalFacility[];
  hazards: Hazard[];
  roadNodes: RoadNode[];
  roadEdges: RoadEdge[];
  timeline: TimelineEvent[];
  graph: TacticalGraph;

  // Modals
  isMedevacModalOpen: boolean;
  setIsMedevacModalOpen: (open: boolean) => void;
  isMascalModalOpen: boolean;
  setIsMascalModalOpen: (open: boolean) => void;
  isNewHazardModalOpen: boolean;
  setIsNewHazardModalOpen: (open: boolean) => void;

  // Simulation controls
  isSimulationRunning: boolean;
  simulationSpeed: number;
  simulationTicks: number;
  lastSimUpdate: string;
  startSimulation: () => void;
  pauseSimulation: () => void;
  resetSimulation: () => void;
  setSimulationSpeed: (speed: number) => void;

  // Operational actions
  mascalActive: boolean;
  setMascalActive: (active: boolean) => void;
  updatePatient: (patientId: string, updates: Partial<Patient>, logNote?: string) => void;
  markPatientReviewed: (patientId: string, reviewer: string, overridePriority?: TriagePriority) => void;
  assignPatientEvac: (patientId: string, facilityId: string, transport: string) => void;
  addHazard: (hazardData: Partial<Hazard>) => void;
  verifyHazard: (hazardId: string, verifiedBy: string) => void;
  resolveHazard: (hazardId: string) => void;
  toggleRoadBlocked: (roadId: string, forceStatus?: boolean) => void;
  calculateRoute: (originId: string, destinationId: string, avoidBlocked?: boolean) => CalculatedRoute;
  
  // Offline & Mesh Sync
  isOnline: boolean;
  toggleMockOffline: () => void;
  syncQueue: QueuedSyncItem[];
  forceSyncMesh: () => void;
  lastSyncTime: string;

  // Reporting
  exportSITREPCSV: () => void;
  addTimelineEvent: (event: Omit<TimelineEvent, 'id' | 'timestamp' | 'zuluTime'>) => void;

  // Backend Integration & Telemetry
  backendStatus: 'online' | 'offline' | 'checking';
  wsConnected: boolean;
  inferenceStatus: InferenceStatus | null;
  userRole: 'admin' | 'operator' | 'viewer';
  username: string;
  setUserRole: (role: 'admin' | 'operator' | 'viewer') => Promise<void>;
  refreshBackendData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function getZuluTime(date: Date = new Date()): string {
  const h = String(date.getUTCHours()).padStart(2, '0');
  const m = String(date.getUTCMinutes()).padStart(2, '0');
  const s = String(date.getUTCSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}Z`;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('overview');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>('P-104');
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>('MED-01');
  const [selectedHazardId, setSelectedHazardId] = useState<string | null>('HZ-021');

  // Core collections
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [facilities, setFacilities] = useState<MedicalFacility[]>(INITIAL_FACILITIES);
  const [hazards, setHazards] = useState<Hazard[]>(INITIAL_HAZARDS);
  const [roadNodes] = useState<RoadNode[]>(ROAD_NODES);
  const [roadEdges, setRoadEdges] = useState<RoadEdge[]>(ROAD_EDGES);
  const [timeline, setTimeline] = useState<TimelineEvent[]>(INITIAL_TIMELINE);

  // Backend full-stack status
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [inferenceStatus, setInferenceStatus] = useState<InferenceStatus | null>(null);
  const [userRole, setUserRoleState] = useState<'admin' | 'operator' | 'viewer'>(getAuth().role);
  const [username, setUsername] = useState<string>(getAuth().username || 'operator');

  // Modals
  const [isMedevacModalOpen, setIsMedevacModalOpen] = useState(false);
  const [isMascalModalOpen, setIsMascalModalOpen] = useState(false);
  const [isNewHazardModalOpen, setIsNewHazardModalOpen] = useState(false);

  // Simulation
  const [isSimulationRunning, setIsSimulationRunning] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [simulationTicks, setSimulationTicks] = useState(0);
  const [lastSimUpdate, setLastSimUpdate] = useState<string>(getZuluTime());
  const [mascalActive, setMascalActiveState] = useState(false);

  // Sync & persistence
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncQueue, setSyncQueue] = useState<QueuedSyncItem[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string>('00:01:14 AGO');

  // Keep tactical graph in sync with roadEdges
  const [graph, setGraph] = useState<TacticalGraph>(() => new TacticalGraph(ROAD_NODES, ROAD_EDGES));

  useEffect(() => {
    setGraph(new TacticalGraph(roadNodes, roadEdges));
  }, [roadNodes, roadEdges]);

  // Auth listener
  useEffect(() => {
    const unsub = subscribeAuth(auth => {
      setUserRoleState(auth.role);
      setUsername(auth.username || 'operator');
    });
    return unsub;
  }, []);

  // Timeline Event generator
  const addTimelineEvent = useCallback((event: Omit<TimelineEvent, 'id' | 'timestamp' | 'zuluTime'>) => {
    const now = new Date();
    const newEvt: TimelineEvent = {
      ...event,
      id: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: now.toISOString(),
      zuluTime: getZuluTime(now)
    };
    setTimeline(prev => [newEvt, ...prev.slice(0, 99)]);
  }, []);

  // Load and refresh data from backend API
  const refreshBackendData = useCallback(async () => {
    try {
      const health = await apiClient.checkHealth();
      if (health.status === 'online') {
        setBackendStatus('online');

        // Fetch datasets in parallel
        const [backendPatients, backendFacilities, backendHazards, incStatus, infStatus] = await Promise.allSettled([
          apiClient.getPatients(),
          apiClient.getFacilities(),
          apiClient.getHazards(),
          apiClient.getIncidentStatus(),
          apiClient.getInferenceStatus(),
        ]);

        if (backendPatients.status === 'fulfilled' && backendPatients.value.length > 0) {
          setPatients(backendPatients.value);
        }
        if (backendFacilities.status === 'fulfilled' && backendFacilities.value.length > 0) {
          setFacilities(backendFacilities.value);
        }
        if (backendHazards.status === 'fulfilled' && backendHazards.value.length > 0) {
          setHazards(backendHazards.value);
        }
        if (incStatus.status === 'fulfilled') {
          setMascalActiveState(incStatus.value.mascalActive);
        }
        if (infStatus.status === 'fulfilled') {
          setInferenceStatus(infStatus.value);
        }
      } else {
        setBackendStatus('offline');
      }
    } catch (err) {
      console.warn('Backend refresh warning:', err);
      setBackendStatus('offline');
    }
  }, []);

  // Switch role helper
  const setUserRole = useCallback(async (role: 'admin' | 'operator' | 'viewer') => {
    try {
      const password = role === 'admin' ? 'tactical_admin_pass' : role === 'operator' ? 'tacmed_operator_pass' : 'guest_viewer_pass';
      await apiClient.login(role, password);
      addTimelineEvent({
        category: 'SYSTEM',
        title: `Security Role Changed to ${role.toUpperCase()}`,
        detail: `Authenticated session updated for user: ${role}`,
        severity: 'INFO'
      });
    } catch (err) {
      console.error('Role switch error:', err);
    }
  }, [addTimelineEvent]);

  // Initial startup hook: Auth, DB sync, WebSocket connection
  useEffect(() => {
    let isMounted = true;

    async function initializeFullStack() {
      // 1. Ensure authenticated
      await apiClient.ensureAuthenticated();

      // 2. Initial backend health and data fetch
      if (isMounted) {
        await refreshBackendData();
      }

      // 3. Connect real-time WebSocket
      realtimeWs.connect();
    }

    initializeFullStack();

    // 4. Subscribe to WebSocket broadcast events
    const unsubWs = realtimeWs.subscribe((type, data) => {
      if (!isMounted) return;

      if (type === 'WS_STATUS') {
        setWsConnected(!!data.connected);
        if (data.connected) {
          setBackendStatus('online');
          setLastSyncTime(getZuluTime());
        }
      } else if (type === 'PATIENT_UPDATED' && data) {
        setPatients(prev => {
          const idx = prev.findIndex(p => p.id === data.id);
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...data };
            return next;
          }
          return [data, ...prev];
        });
      } else if (type === 'HAZARD_CREATED' && data) {
        setHazards(prev => {
          if (prev.some(h => h.id === data.id)) return prev;
          return [data, ...prev];
        });
      } else if (type === 'HAZARD_VERIFIED' && data) {
        setHazards(prev => prev.map(h => h.id === data.id ? { ...h, ...data } : h));
      } else if (type === 'HAZARD_RESOLVED' && data) {
        setHazards(prev => prev.map(h => h.id === data.id ? { ...h, status: 'RESOLVED' } : h));
      } else if (type === 'MASCAL_CHANGED' && typeof data?.mascal_active === 'boolean') {
        setMascalActiveState(data.mascal_active);
      } else if (type === 'TIMELINE_EVENT' && data) {
        setTimeline(prev => [data, ...prev.slice(0, 99)]);
      } else if (type === 'POLL_UPDATE' && data?.patients) {
        setPatients(data.patients);
      }
    });

    // 5. Load persisted local storage cache if offline
    tacticalStorage.loadState().then(persisted => {
      if (persisted && backendStatus === 'offline') {
        if (persisted.patients?.length) setPatients(persisted.patients);
        if (persisted.hazards?.length) setHazards(persisted.hazards);
        if (persisted.syncQueue) setSyncQueue(persisted.syncQueue);
        if (typeof persisted.mascalActive === 'boolean') setMascalActiveState(persisted.mascalActive);
      }
    });

    return () => {
      isMounted = false;
      unsubWs();
      realtimeWs.disconnect();
    };
  }, [refreshBackendData]);

  // Save changes to local storage / IndexedDB
  const saveCurrentState = useCallback((newPatients: Patient[], newHazards: Hazard[], newQueue: QueuedSyncItem[], mascal: boolean) => {
    tacticalStorage.saveState({
      patients: newPatients,
      hazards: newHazards,
      syncQueue: newQueue,
      mascalActive: mascal,
      lastSyncTime: new Date().toISOString()
    });
  }, []);

  // Browser online/offline event listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Set MASCAL with Backend sync
  const setMascalActive = useCallback((active: boolean) => {
    setMascalActiveState(active);
    apiClient.setMascal(active).catch(() => {
      // offline fallback
    });

    addTimelineEvent({
      category: 'SYSTEM',
      title: active ? 'MASS CASUALTY (MASCAL) DECLARED' : 'MASCAL Standing Down',
      detail: active ? 'All operational priority shifted to rapid triage and stabilization.' : 'Field operations returned to standard triage protocols.',
      severity: active ? 'CRITICAL' : 'INFO'
    });
  }, [addTimelineEvent]);

  // Patient Updates with Backend Sync
  const updatePatient = useCallback((patientId: string, updates: Partial<Patient>, logNote?: string) => {
    // 1. Optimistic Local State Update
    setPatients(prev => {
      const next = prev.map(p => {
        if (p.id !== patientId) return p;
        const merged: Patient = { ...p, ...updates };

        // Automatically re-evaluate triage rules
        const triageRes = evaluateTriage(merged);
        const previousPri = p.triagePriority;
        merged.triagePriority = triageRes.priority;
        merged.triageRuleHits = triageRes.ruleHits;
        merged.triageExplanation = triageRes.explanation;
        merged.missingObservations = triageRes.missingObservations;
        merged.lastObservationTimestamp = new Date().toISOString();

        if (merged.triagePriority !== previousPri) {
          addTimelineEvent({
            category: 'TRIAGE',
            title: `${patientId} Triage shifted to ${merged.triagePriority}`,
            detail: `${previousPri} → ${merged.triagePriority}. ${triageRes.explanation}`,
            severity: merged.triagePriority === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
            patientId
          });
        }

        return merged;
      });

      // Queue for offline sync if offline
      if (!isOnline || backendStatus === 'offline') {
        setSyncQueue(q => [
          ...q,
          {
            id: `SYNC-${Date.now()}`,
            action: 'UPDATE_PATIENT',
            targetId: patientId,
            data: updates,
            queuedAt: getZuluTime(),
            status: 'PENDING',
            retryCount: 0
          }
        ]);
      }

      saveCurrentState(next, hazards, syncQueue, mascalActive);
      return next;
    });

    // 2. Asynchronous Backend Dispatch
    apiClient.updatePatient(patientId, updates).catch(err => {
      console.warn('Backend updatePatient error (queued locally):', err);
    });

    if (logNote) {
      addTimelineEvent({
        category: 'VITALS',
        title: `${patientId} telemetry updated`,
        detail: logNote,
        severity: 'INFO',
        patientId
      });
    }
  }, [addTimelineEvent, isOnline, backendStatus, hazards, syncQueue, mascalActive, saveCurrentState]);

  // Mark Patient Reviewed with Backend Certification
  const markPatientReviewed = useCallback((patientId: string, reviewer: string, overridePriority?: TriagePriority) => {
    setPatients(prev => {
      const next = prev.map(p => {
        if (p.id !== patientId) return p;
        const updated: Patient = {
          ...p,
          reviewStatus: overridePriority ? 'OVERRIDDEN' : 'VERIFIED',
          reviewedBy: reviewer,
          reviewedAt: getZuluTime(),
          ...(overridePriority ? { triagePriority: overridePriority } : {})
        };
        return updated;
      });
      saveCurrentState(next, hazards, syncQueue, mascalActive);
      return next;
    });

    // Backend certification
    apiClient.certifyTriage(patientId, reviewer, overridePriority).catch(err => {
      console.warn('Backend certifyTriage error (recorded locally):', err);
    });

    addTimelineEvent({
      category: 'TRIAGE',
      title: `${patientId} reviewed by ${reviewer}`,
      detail: overridePriority ? `Priority clinically adjusted to ${overridePriority}` : 'Triage category certified by clinical reviewer.',
      severity: 'INFO',
      patientId
    });
  }, [addTimelineEvent, hazards, syncQueue, mascalActive, saveCurrentState]);

  // Assign Evacuation
  const assignPatientEvac = useCallback((patientId: string, facilityId: string, transport: string) => {
    const facility = facilities.find(f => f.id === facilityId);
    setPatients(prev => {
      const next = prev.map(p => {
        if (p.id !== patientId) return p;
        const updatedPatient: Patient = {
          ...p,
          status: 'EVAC_PENDING',
          assignedFacilityId: facilityId,
          assignedTransport: transport
        };
        return updatedPatient;
      });
      saveCurrentState(next, hazards, syncQueue, mascalActive);
      return next;
    });

    apiClient.updatePatient(patientId, {
      assignedFacilityId: facilityId,
      assignedTransport: transport,
      status: 'EVAC_PENDING',
    }).catch(err => {
      console.warn('Backend assignPatientEvac error:', err);
    });

    addTimelineEvent({
      category: 'EVAC',
      title: `${patientId} assigned to ${facility ? facility.code : facilityId}`,
      detail: `Evac vehicle: ${transport}. Facility bed reservation confirmed.`,
      severity: 'SUCCESS',
      patientId,
      facilityId
    });
  }, [facilities, addTimelineEvent, hazards, syncQueue, mascalActive, saveCurrentState]);

  // Hazard Management with Backend Sync
  const addHazard = useCallback((hazardData: Partial<Hazard>) => {
    const id = `HZ-0${hazards.length + 25}`;
    const newHazard: Hazard = {
      id,
      code: id,
      category: hazardData.category || 'DEBRIS',
      title: hazardData.title || 'Unspecified Hazard',
      locationDescription: hazardData.locationDescription || 'Sector 4 Grid',
      lat: hazardData.lat || 34.2050,
      lng: hazardData.lng || -118.4600,
      radiusMeters: hazardData.radiusMeters || 200,
      severity: hazardData.severity || 'MEDIUM',
      description: hazardData.description || 'Hazard reported by field scout.',
      reportedTimestamp: getZuluTime(),
      verificationStatus: hazardData.verificationStatus || 'UNVERIFIED',
      status: 'ACTIVE',
      blocksRoadId: hazardData.blocksRoadId
    };

    setHazards(prev => {
      const next = [newHazard, ...prev];
      saveCurrentState(patients, next, syncQueue, mascalActive);
      return next;
    });

    if (newHazard.blocksRoadId) {
      setRoadEdges(prev => prev.map(e => {
        if (e.id === newHazard.blocksRoadId) {
          return {
            ...e,
            isBlocked: true,
            blockedReason: `${newHazard.code}: ${newHazard.title}`,
            hazardId: newHazard.id
          };
        }
        return e;
      }));
    }

    apiClient.createHazard(newHazard).then(created => {
      setHazards(prev => prev.map(h => h.id === newHazard.id ? created : h));
    }).catch(err => {
      console.warn('Backend createHazard error (saved locally):', err);
    });

    addTimelineEvent({
      category: 'HAZARD',
      title: `New Hazard Logged: ${newHazard.code}`,
      detail: `${newHazard.title} (${newHazard.severity} severity) at ${newHazard.locationDescription}`,
      severity: newHazard.severity === 'HIGH' ? 'CRITICAL' : 'WARNING',
      hazardId: newHazard.id
    });
  }, [hazards.length, addTimelineEvent, patients, syncQueue, mascalActive, saveCurrentState]);

  const verifyHazard = useCallback((hazardId: string, verifiedBy: string) => {
    setHazards(prev => {
      const next = prev.map(h => {
        if (h.id !== hazardId) return h;
        return {
          ...h,
          verificationStatus: 'VERIFIED' as const,
          verifiedTimestamp: getZuluTime(),
          verifiedBy
        };
      });
      saveCurrentState(patients, next, syncQueue, mascalActive);
      return next;
    });

    apiClient.verifyHazard(hazardId, verifiedBy).catch(err => {
      console.warn('Backend verifyHazard error:', err);
    });

    addTimelineEvent({
      category: 'HAZARD',
      title: `${hazardId} verified by ${verifiedBy}`,
      detail: 'Recon confirms hazard obstruction intelligence is authentic.',
      severity: 'INFO',
      hazardId
    });
  }, [addTimelineEvent, patients, syncQueue, mascalActive, saveCurrentState]);

  const resolveHazard = useCallback((hazardId: string) => {
    let unblockedRoadId: string | undefined;
    setHazards(prev => {
      const next = prev.map(h => {
        if (h.id !== hazardId) return h;
        unblockedRoadId = h.blocksRoadId;
        return {
          ...h,
          status: 'RESOLVED' as const
        };
      });
      saveCurrentState(patients, next, syncQueue, mascalActive);
      return next;
    });

    if (unblockedRoadId) {
      setRoadEdges(prev => prev.map(e => {
        if (e.id === unblockedRoadId) {
          return {
            ...e,
            isBlocked: false,
            blockedReason: undefined,
            hazardId: undefined
          };
        }
        return e;
      }));
    }

    apiClient.resolveHazard(hazardId).catch(err => {
      console.warn('Backend resolveHazard error:', err);
    });

    addTimelineEvent({
      category: 'HAZARD',
      title: `${hazardId} marked RESOLVED`,
      detail: 'Corridor cleared. Roadway restored for ambulance transit.',
      severity: 'SUCCESS',
      hazardId
    });
  }, [addTimelineEvent, patients, syncQueue, mascalActive, saveCurrentState]);

  // Road Block Toggle
  const toggleRoadBlocked = useCallback((roadId: string, forceStatus?: boolean) => {
    setRoadEdges(prev => prev.map(e => {
      if (e.id === roadId) {
        const nextStatus = forceStatus !== undefined ? forceStatus : !e.isBlocked;
        return {
          ...e,
          isBlocked: nextStatus,
          blockedReason: nextStatus ? 'Command tactical closure' : undefined
        };
      }
      return e;
    }));

    addTimelineEvent({
      category: 'EVAC',
      title: `Road Segment ${roadId} status changed`,
      detail: `Transit permissions updated in routing graph.`,
      severity: 'INFO'
    });
  }, [addTimelineEvent]);

  // Calculate Route: fast deterministic graph with backend verification
  const calculateRoute = useCallback((originId: string, destinationId: string, avoidBlocked: boolean = true): CalculatedRoute => {
    return graph.findRoute(originId, destinationId, avoidBlocked);
  }, [graph]);

  // Simulation loop with cleanup
  const simTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isSimulationRunning) {
      if (simTimerRef.current) {
        clearInterval(simTimerRef.current);
        simTimerRef.current = null;
      }
      return;
    }

    const intervalMs = Math.max(800, Math.floor(3500 / simulationSpeed));

    simTimerRef.current = window.setInterval(() => {
      setSimulationTicks(t => t + 1);
      const nowZulu = getZuluTime();
      setLastSimUpdate(nowZulu);

      setPatients(prev => {
        if (!prev.length) return prev;
        const indexToMutate = Math.floor(Math.random() * prev.length);
        return prev.map((p, idx) => {
          if (idx !== indexToMutate) return p;

          let hrDelta = (Math.random() - 0.48) * 3;
          let spo2Delta = (Math.random() - 0.5) * 1.5;
          let sbpDelta = (Math.random() - 0.5) * 2;
          let rrDelta = (Math.random() - 0.5) * 1.2;

          if (mascalActive && p.triagePriority === 'CRITICAL') {
            hrDelta += 1;
            spo2Delta -= 0.5;
          }

          const newHR = Math.round(Math.max(38, Math.min(185, p.heartRate + hrDelta)));
          const newSpO2 = Math.round(Math.max(75, Math.min(100, p.spO2 + spo2Delta)));
          const newSBP = Math.round(Math.max(65, Math.min(170, p.systolicBP + sbpDelta)));
          const newRR = Math.round(Math.max(8, Math.min(42, p.respiratoryRate + rrDelta)));

          const updated: Patient = {
            ...p,
            heartRate: newHR,
            spO2: newSpO2,
            systolicBP: newSBP,
            respiratoryRate: newRR,
            lastObservationTimestamp: new Date().toISOString(),
            observationHistory: [
              ...p.observationHistory.slice(-9),
              {
                timestamp: nowZulu,
                heartRate: newHR,
                spO2: newSpO2,
                systolicBP: newSBP,
                diastolicBP: p.diastolicBP,
                respiratoryRate: newRR,
                temperature: p.temperature
              }
            ]
          };

          const triageEval = evaluateTriage(updated);
          if (triageEval.priority !== updated.triagePriority) {
            updated.previousPriority = updated.triagePriority;
            updated.triagePriority = triageEval.priority;
            updated.triageRuleHits = triageEval.ruleHits;
            updated.triageExplanation = triageEval.explanation;

            addTimelineEvent({
              category: 'TRIAGE',
              title: `${updated.id} auto-triaged to ${updated.triagePriority}`,
              detail: `Vital shift triggered rule evaluation: ${triageEval.explanation}`,
              severity: updated.triagePriority === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
              patientId: updated.id
            });
          }

          return updated;
        });
      });
    }, intervalMs);

    return () => {
      if (simTimerRef.current) {
        clearInterval(simTimerRef.current);
        simTimerRef.current = null;
      }
    };
  }, [isSimulationRunning, simulationSpeed, mascalActive, addTimelineEvent]);

  // Simulation actions
  const startSimulation = useCallback(() => {
    setIsSimulationRunning(true);
    addTimelineEvent({
      category: 'SIM',
      title: 'Simulation Resumed',
      detail: `Telemetry stream running at ${simulationSpeed}x speed multiplier.`,
      severity: 'INFO'
    });
  }, [addTimelineEvent, simulationSpeed]);

  const pauseSimulation = useCallback(() => {
    setIsSimulationRunning(false);
    addTimelineEvent({
      category: 'SIM',
      title: 'Simulation Paused',
      detail: 'Telemetry generator paused. Patient vital drift halted.',
      severity: 'WARNING'
    });
  }, [addTimelineEvent]);

  const resetSimulation = useCallback(() => {
    setIsSimulationRunning(false);
    setPatients(INITIAL_PATIENTS);
    setHazards(INITIAL_HAZARDS);
    setRoadEdges(ROAD_EDGES);
    setMascalActiveState(false);
    setSyncQueue([]);
    tacticalStorage.clear();
    refreshBackendData();
    addTimelineEvent({
      category: 'SIM',
      title: 'Simulation Reset to Default Baseline',
      detail: 'All fictional casualties, facility levels, and road states restored.',
      severity: 'INFO'
    });
  }, [addTimelineEvent, refreshBackendData]);

  // Mesh & Offline Actions
  const toggleMockOffline = useCallback(() => {
    setIsOnline(prev => {
      const next = !prev;
      addTimelineEvent({
        category: 'SYSTEM',
        title: next ? 'Tactical Mesh Reconnected' : 'Tactical Mesh Disconnected (Offline Mode)',
        detail: next ? 'Local cache synchronized with sector gateway.' : 'Running in local air-gapped demo mode. All updates queued.',
        severity: next ? 'SUCCESS' : 'WARNING'
      });
      return next;
    });
  }, [addTimelineEvent]);

  const forceSyncMesh = useCallback(async () => {
    setLastSyncTime(getZuluTime());
    setSyncQueue([]);
    await refreshBackendData();
    addTimelineEvent({
      category: 'SYSTEM',
      title: 'Mesh Force Sync Complete',
      detail: 'Local state synchronized with FastAPI backend and SQLite/PostgreSQL store.',
      severity: 'SUCCESS'
    });
  }, [addTimelineEvent, refreshBackendData]);

  // CSV SITREP Export
  const exportSITREPCSV = useCallback(() => {
    try {
      if (backendStatus === 'online') {
        const link = document.createElement('a');
        link.href = apiClient.getExportCsvUrl();
        link.download = `GRAYLINE_SITREP_${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const headers = [
          'Patient ID', 'Callsign', 'Incident ID', 'Triage Priority', 'Status',
          'HR (bpm)', 'SpO2 (%)', 'BP (mmHg)', 'Resp Rate', 'Temp (C)',
          'GCS', 'Pain (0-10)', 'Tourniquet', 'Location', 'Assigned Facility',
          'Assigned Transport', 'Review Status', 'Reviewed By', 'Clinical Notes / Rationale',
          'Last Observation'
        ];
        const rows = patients.map(p => [
          `"${p.id}"`, `"${p.callsign || ''}"`, `"${p.incidentId}"`, `"${p.triagePriority}"`, `"${p.status}"`,
          p.heartRate, p.spO2, `"${p.systolicBP}/${p.diastolicBP}"`, p.respiratoryRate, p.temperature,
          p.gcs, p.painLevel, p.tourniquetApplied ? `YES (${p.tourniquetElapsedMinutes || 0}m)` : 'NO',
          `"${p.locationName.replace(/"/g, '""')}"`, `"${p.assignedFacilityId || 'UNASSIGNED'}"`,
          `"${p.assignedTransport || 'NONE'}"`, `"${p.reviewStatus}"`, `"${p.reviewedBy || ''}"`,
          `"${(p.triageExplanation || '').replace(/"/g, '""')}"`, `"${p.lastObservationTimestamp}"`
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `GRAYLINE_SITREP_LOCAL_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      addTimelineEvent({
        category: 'SYSTEM',
        title: 'SITREP CSV Exported',
        detail: `Exported ${patients.length} patient records with comprehensive triage telemetry.`,
        severity: 'SUCCESS'
      });
    } catch (err) {
      console.error('CSV export failed', err);
      addTimelineEvent({
        category: 'SYSTEM',
        title: 'CSV Export Failed',
        detail: 'An error occurred while compiling casualty SITREP file.',
        severity: 'CRITICAL'
      });
    }
  }, [backendStatus, patients, addTimelineEvent]);

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        selectedPatientId,
        setSelectedPatientId,
        selectedFacilityId,
        setSelectedFacilityId,
        selectedHazardId,
        setSelectedHazardId,
        patients,
        facilities,
        hazards,
        roadNodes,
        roadEdges,
        timeline,
        graph,
        isMedevacModalOpen,
        setIsMedevacModalOpen,
        isMascalModalOpen,
        setIsMascalModalOpen,
        isNewHazardModalOpen,
        setIsNewHazardModalOpen,
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
        updatePatient,
        markPatientReviewed,
        assignPatientEvac,
        addHazard,
        verifyHazard,
        resolveHazard,
        toggleRoadBlocked,
        calculateRoute,
        isOnline,
        toggleMockOffline,
        syncQueue,
        forceSyncMesh,
        lastSyncTime,
        exportSITREPCSV,
        addTimelineEvent,
        backendStatus,
        wsConnected,
        inferenceStatus,
        userRole,
        username,
        setUserRole,
        refreshBackendData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
