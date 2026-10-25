/**
 * Complete Full-Stack API Client for GRAYLINE Field Terminal
 * Connects React UI to the Python FastAPI backend on port 8000 (via Vite proxy /api and /ws)
 * Features:
 * - JWT authentication & token injection
 * - Typed REST endpoints with snake_case <-> camelCase transformations
 * - Real-time WebSocket subscriptions with auto-reconnect and polling fallback
 * - Decoupled GPU/inference health telemetry checks
 * - Graceful offline fallback integration
 */

import {
  Patient,
  MedicalFacility,
  Hazard,
  TimelineEvent,
  CalculatedRoute,
  VitalObservation,
  TriagePriority,
  PatientStatus,
  ReviewStatus,
  HazardSeverity,
  HazardCategory,
  FacilityType,
} from '../types';

const API_BASE = '/api';

export interface AuthState {
  token: string | null;
  username: string | null;
  role: 'admin' | 'operator' | 'viewer';
  isAuthenticated: boolean;
}

export interface BackendHealth {
  status: 'online' | 'offline' | 'degraded';
  database: string;
  version: string;
  timestamp: string;
  latencyMs?: number;
}

export interface InferenceStatus {
  enabled: boolean;
  status: 'GPU_ACTIVE' | 'DETERMINISTIC_FALLBACK' | 'UNREACHABLE';
  device: string;
  provider: string;
  notes: string;
}

// -------------------------------------------------------------
// Authentication Token Storage
// -------------------------------------------------------------
let currentAuth: AuthState = {
  token: localStorage.getItem('grayline_jwt_token'),
  username: localStorage.getItem('grayline_username') || 'operator',
  role: (localStorage.getItem('grayline_role') as 'admin' | 'operator' | 'viewer') || 'operator',
  isAuthenticated: !!localStorage.getItem('grayline_jwt_token'),
};

const authListeners: Array<(state: AuthState) => void> = [];

export function subscribeAuth(callback: (state: AuthState) => void) {
  authListeners.push(callback);
  callback(currentAuth);
  return () => {
    const idx = authListeners.indexOf(callback);
    if (idx !== -1) authListeners.splice(idx, 1);
  };
}

function updateAuthState(newAuth: Partial<AuthState>) {
  currentAuth = { ...currentAuth, ...newAuth };
  if (currentAuth.token) {
    localStorage.setItem('grayline_jwt_token', currentAuth.token);
    localStorage.setItem('grayline_username', currentAuth.username || 'operator');
    localStorage.setItem('grayline_role', currentAuth.role);
  } else {
    localStorage.removeItem('grayline_jwt_token');
    localStorage.removeItem('grayline_username');
    localStorage.removeItem('grayline_role');
  }
  authListeners.forEach(listener => listener(currentAuth));
}

export function getAuth(): AuthState {
  return currentAuth;
}

// -------------------------------------------------------------
// HTTP Request Helper
// -------------------------------------------------------------
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (currentAuth.token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${currentAuth.token}`;
  }

  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorDetail = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  return response.json() as Promise<T>;
}

// -------------------------------------------------------------
// Object Mappers (Backend snake_case <-> Frontend camelCase)
// -------------------------------------------------------------
export function mapBackendPatient(p: any): Patient {
  return {
    id: p.id,
    incidentId: p.incident_id || 'INC-07-ALFA',
    callsign: p.callsign || undefined,
    injurySummary: p.injury_summary || 'Trauma casualty',
    triagePriority: (p.triage_priority?.toUpperCase() as TriagePriority) || 'STABLE',
    previousPriority: p.previous_priority?.toUpperCase() as TriagePriority | undefined,
    status: (p.status?.toUpperCase() as PatientStatus) || 'WAITING_TRIAGE',
    heartRate: p.heart_rate,
    spO2: p.spo2,
    systolicBP: p.systolic_bp,
    diastolicBP: p.diastolic_bp,
    respiratoryRate: p.respiratory_rate,
    temperature: p.temperature,
    gcs: p.gcs ?? 15,
    painLevel: p.pain_level ?? 0,
    tourniquetApplied: !!p.tourniquet_applied,
    tourniquetTime: p.tourniquet_time || undefined,
    tourniquetElapsedMinutes: p.tourniquet_elapsed_mins ?? 0,
    triageRuleHits: p.triage_rule_hits || [],
    triageExplanation: p.triage_explanation || 'Awaiting rule calculation',
    missingObservations: p.missing_observations || [],
    reviewStatus: (p.review_status?.toUpperCase() as ReviewStatus) || 'PENDING',
    reviewedBy: p.reviewed_by || undefined,
    reviewedAt: p.reviewed_at || undefined,
    lat: p.lat,
    lng: p.lng,
    locationName: p.location_name || 'Grid Sector',
    assignedFacilityId: p.assigned_facility_id || undefined,
    assignedTransport: p.assigned_transport || undefined,
    evacPriorityRank: p.evac_priority_rank || undefined,
    observationHistory: (p.observation_history || []).map((o: any): VitalObservation => ({
      timestamp: o.timestamp,
      heartRate: o.heart_rate,
      spO2: o.spo2,
      systolicBP: o.systolic_bp,
      diastolicBP: o.diastolic_bp,
      respiratoryRate: o.respiratory_rate,
      temperature: o.temperature,
      gcs: o.gcs,
      painLevel: o.pain_level,
    })),
    lastObservationTimestamp: p.last_observation_timestamp || new Date().toISOString(),
  };
}

export function mapBackendFacility(f: any): MedicalFacility {
  return {
    id: f.id,
    code: f.code,
    name: f.name,
    type: (f.type as FacilityType) || 'FORWARD_SURGICAL',
    lat: f.lat,
    lng: f.lng,
    totalCapacity: f.total_capacity,
    occupiedBeds: f.occupied_beds,
    icuCapacity: f.icu_capacity,
    icuOccupied: f.icu_occupied,
    surgicalTheaters: f.surgical_theaters,
    bloodUnitsAvailable: f.blood_units_available,
    status: f.status,
    receivingStatus: !!f.receiving_status,
    specialties: f.specialties || [],
    lastUpdated: f.last_updated || new Date().toISOString(),
  };
}

export function mapBackendHazard(h: any): Hazard {
  return {
    id: h.id,
    code: h.code,
    category: (h.category as HazardCategory) || 'DEBRIS',
    title: h.title,
    locationDescription: h.location_description,
    lat: h.lat,
    lng: h.lng,
    radiusMeters: h.radius_meters,
    severity: (h.severity as HazardSeverity) || 'MEDIUM',
    description: h.description,
    reportedTimestamp: h.reported_timestamp,
    verifiedTimestamp: h.verified_timestamp || undefined,
    verificationStatus: h.verification_status || 'UNVERIFIED',
    verifiedBy: h.verified_by || undefined,
    status: h.status || 'ACTIVE',
    blocksRoadId: h.blocks_road_id || undefined,
    estimatedClearHours: h.estimated_clear_hours || undefined,
  };
}

export function mapBackendTimeline(e: any): TimelineEvent {
  return {
    id: e.id,
    timestamp: e.timestamp,
    zuluTime: e.zulu_time || '00:00:00Z',
    category: e.category,
    title: e.title,
    detail: e.detail,
    severity: e.severity,
    patientId: e.patient_id || undefined,
    facilityId: e.facility_id || undefined,
    hazardId: e.hazard_id || undefined,
  };
}

// -------------------------------------------------------------
// API Service Methods
// -------------------------------------------------------------
export const apiClient = {
  // --- Auth ---
  async login(username: string, password: string): Promise<AuthState> {
    const res = await apiRequest<{ access_token: string; role: string; username: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    const state: AuthState = {
      token: res.access_token,
      username: res.username,
      role: res.role as 'admin' | 'operator' | 'viewer',
      isAuthenticated: true,
    };
    updateAuthState(state);
    return state;
  },

  logout() {
    updateAuthState({ token: null, username: null, isAuthenticated: false, role: 'operator' });
  },

  async ensureAuthenticated(): Promise<AuthState> {
    if (currentAuth.token) {
      try {
        const me = await apiRequest<any>('/auth/me');
        updateAuthState({ role: me.role, username: me.username, isAuthenticated: true });
        return currentAuth;
      } catch {
        // Token expired, log in as default operator
      }
    }
    // Auto login as operator for seamless tactical demo experience
    try {
      return await this.login('operator', 'tacmed_operator_pass');
    } catch (err) {
      console.warn('API auto-login fallback failed:', err);
      return currentAuth;
    }
  },

  // --- Health ---
  async checkHealth(): Promise<BackendHealth> {
    const start = performance.now();
    try {
      const res = await apiRequest<{ status: string; database: string; version: string; timestamp: string }>('/health');
      const latencyMs = Math.round(performance.now() - start);
      return {
        status: res.status === 'ok' ? 'online' : 'degraded',
        database: res.database,
        version: res.version,
        timestamp: res.timestamp,
        latencyMs,
      };
    } catch {
      return {
        status: 'offline',
        database: 'disconnected',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        latencyMs: 0,
      };
    }
  },

  // --- Patients ---
  async getPatients(filters?: { search?: string; priority?: string; status?: string }): Promise<Patient[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.set('search', filters.search);
    if (filters?.priority) params.set('priority', filters.priority);
    if (filters?.status) params.set('status', filters.status);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const list = await apiRequest<any[]>(`/patients${qs}`);
    return list.map(mapBackendPatient);
  },

  async getPatient(id: string): Promise<Patient> {
    const p = await apiRequest<any>(`/patients/${id}`);
    return mapBackendPatient(p);
  },

  async createPatient(patient: Partial<Patient>): Promise<Patient> {
    const payload = {
      id: patient.id,
      incident_id: patient.incidentId || 'INC-07-ALFA',
      callsign: patient.callsign,
      injury_summary: patient.injurySummary || 'Tactical trauma',
      heart_rate: patient.heartRate ?? 80,
      spo2: patient.spO2 ?? 98,
      systolic_bp: patient.systolicBP ?? 120,
      diastolic_bp: patient.diastolicBP ?? 80,
      respiratory_rate: patient.respiratoryRate ?? 16,
      temperature: patient.temperature ?? 37.0,
      gcs: patient.gcs ?? 15,
      pain_level: patient.painLevel ?? 0,
      tourniquet_applied: patient.tourniquetApplied ?? false,
      tourniquet_time: patient.tourniquetTime,
      tourniquet_elapsed_mins: patient.tourniquetElapsedMinutes ?? 0,
      lat: patient.lat ?? 34.05,
      lng: patient.lng ?? -118.25,
      location_name: patient.locationName ?? 'Grid Area',
    };
    const res = await apiRequest<any>('/patients', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapBackendPatient(res);
  },

  async updatePatient(id: string, updates: Partial<Patient>): Promise<Patient> {
    const payload: any = {};
    if (updates.callsign !== undefined) payload.callsign = updates.callsign;
    if (updates.injurySummary !== undefined) payload.injury_summary = updates.injurySummary;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.heartRate !== undefined) payload.heart_rate = updates.heartRate;
    if (updates.spO2 !== undefined) payload.spo2 = updates.spO2;
    if (updates.systolicBP !== undefined) payload.systolic_bp = updates.systolicBP;
    if (updates.diastolicBP !== undefined) payload.diastolic_bp = updates.diastolicBP;
    if (updates.respiratoryRate !== undefined) payload.respiratory_rate = updates.respiratoryRate;
    if (updates.temperature !== undefined) payload.temperature = updates.temperature;
    if (updates.gcs !== undefined) payload.gcs = updates.gcs;
    if (updates.painLevel !== undefined) payload.pain_level = updates.painLevel;
    if (updates.tourniquetApplied !== undefined) payload.tourniquet_applied = updates.tourniquetApplied;
    if (updates.tourniquetTime !== undefined) payload.tourniquet_time = updates.tourniquetTime;
    if (updates.tourniquetElapsedMinutes !== undefined) payload.tourniquet_elapsed_mins = updates.tourniquetElapsedMinutes;
    if (updates.assignedFacilityId !== undefined) payload.assigned_facility_id = updates.assignedFacilityId;
    if (updates.assignedTransport !== undefined) payload.assigned_transport = updates.assignedTransport;
    if (updates.triagePriority !== undefined) payload.triage_priority = updates.triagePriority;
    if (updates.reviewStatus !== undefined) payload.review_status = updates.reviewStatus;
    if (updates.reviewedBy !== undefined) payload.reviewed_by = updates.reviewedBy;

    const res = await apiRequest<any>(`/patients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return mapBackendPatient(res);
  },

  // --- Vitals ---
  async addObservation(patientId: string, obs: Partial<VitalObservation>): Promise<any> {
    const payload = {
      heart_rate: obs.heartRate,
      spo2: obs.spO2,
      systolic_bp: obs.systolicBP,
      diastolic_bp: obs.diastolicBP,
      respiratory_rate: obs.respiratoryRate,
      temperature: obs.temperature,
      gcs: obs.gcs ?? 15,
      pain_level: obs.painLevel ?? 0,
    };
    return apiRequest<any>(`/vitals/${patientId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // --- Triage ---
  async certifyTriage(patientId: string, reviewerName: string, overridePriority?: string, clinicalNotes?: string): Promise<Patient> {
    const res = await apiRequest<any>(`/triage/certify/${patientId}`, {
      method: 'POST',
      body: JSON.stringify({
        reviewer_name: reviewerName,
        override_priority: overridePriority,
        clinical_notes: clinicalNotes,
      }),
    });
    return mapBackendPatient(res);
  },

  // --- Evacuation Routing ---
  async calculateRoute(originId: string, destinationId: string, avoidBlocked: boolean = true): Promise<CalculatedRoute> {
    const res = await apiRequest<any>('/evac/route', {
      method: 'POST',
      body: JSON.stringify({
        origin_id: originId,
        destination_id: destinationId,
        avoid_blocked: avoidBlocked,
      }),
    });
    return {
      originId: res.origin_id,
      destinationId: res.destination_id,
      isViable: res.is_viable,
      pathNodeIds: res.path_node_ids,
      pathCoordinates: res.path_coordinates as [number, number][],
      totalDistanceKm: res.total_distance_km,
      estimatedTimeMinutes: res.estimated_time_minutes,
      usedBypass: res.used_bypass,
      avoidedHazards: res.avoided_hazards,
      roadSegments: res.road_segments,
      explanation: res.explanation,
    };
  },

  async getRoadGraph(): Promise<{ nodes: any[]; edges: any[] }> {
    return apiRequest<{ nodes: any[]; edges: any[] }>('/evac/graph');
  },

  // --- Hazards ---
  async getHazards(status?: string): Promise<Hazard[]> {
    const qs = status ? `?status=${status}` : '';
    const list = await apiRequest<any[]>(`/hazards${qs}`);
    return list.map(mapBackendHazard);
  },

  async createHazard(hazard: Partial<Hazard>): Promise<Hazard> {
    const payload = {
      title: hazard.title,
      category: hazard.category || 'DEBRIS',
      severity: hazard.severity || 'MEDIUM',
      location_description: hazard.locationDescription || 'Field Sector',
      lat: hazard.lat,
      lng: hazard.lng,
      radius_meters: hazard.radiusMeters || 250,
      description: hazard.description || 'Reported tactical hazard',
      blocks_road_id: hazard.blocksRoadId || null,
      estimated_clear_hours: hazard.estimatedClearHours || 4,
    };
    const res = await apiRequest<any>('/hazards', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapBackendHazard(res);
  },

  async verifyHazard(id: string, verifiedBy: string): Promise<Hazard> {
    const res = await apiRequest<any>(`/hazards/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ verified_by: verifiedBy }),
    });
    return mapBackendHazard(res);
  },

  async resolveHazard(id: string): Promise<Hazard> {
    const res = await apiRequest<any>(`/hazards/${id}/resolve`, {
      method: 'POST',
    });
    return mapBackendHazard(res);
  },

  // --- Facilities ---
  async getFacilities(): Promise<MedicalFacility[]> {
    const list = await apiRequest<any[]>('/facilities');
    return list.map(mapBackendFacility);
  },

  async updateFacility(id: string, updates: Partial<MedicalFacility>): Promise<MedicalFacility> {
    const payload: any = {};
    if (updates.occupiedBeds !== undefined) payload.occupied_beds = updates.occupiedBeds;
    if (updates.icuOccupied !== undefined) payload.icu_occupied = updates.icuOccupied;
    if (updates.receivingStatus !== undefined) payload.receiving_status = updates.receivingStatus;
    if (updates.status !== undefined) payload.status = updates.status;

    const res = await apiRequest<any>(`/facilities/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return mapBackendFacility(res);
  },

  // --- Incident & Status ---
  async getIncidentStatus(): Promise<{ code: string; title: string; mascalActive: boolean; status: string; totalCasualties: number; criticalCount: number }> {
    const res = await apiRequest<any>('/incidents/status');
    return {
      code: res.code,
      title: res.title,
      mascalActive: res.mascal_active,
      status: res.status,
      totalCasualties: res.total_casualties,
      criticalCount: res.critical_count,
    };
  },

  async setMascal(active: boolean, notes?: string): Promise<any> {
    return apiRequest<any>('/incidents/mascal', {
      method: 'POST',
      body: JSON.stringify({ mascal_active: active, notes }),
    });
  },

  async getTimeline(limit: number = 50): Promise<TimelineEvent[]> {
    const list = await apiRequest<any[]>(`/incidents/timeline?limit=${limit}`);
    return list.map(mapBackendTimeline);
  },

  async logTimelineEvent(event: Omit<TimelineEvent, 'id' | 'timestamp' | 'zuluTime'>): Promise<TimelineEvent> {
    const payload = {
      category: event.category,
      title: event.title,
      detail: event.detail,
      severity: event.severity || 'INFO',
      patient_id: event.patientId || null,
      facility_id: event.facilityId || null,
      hazard_id: event.hazardId || null,
    };
    const res = await apiRequest<any>('/incidents/timeline', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapBackendTimeline(res);
  },

  // --- Inference / GPU Telemetry ---
  async getInferenceStatus(): Promise<InferenceStatus> {
    try {
      const res = await apiRequest<any>('/inference/status');
      return {
        enabled: res.inference_enabled,
        status: res.status,
        device: res.device,
        provider: res.provider,
        notes: res.notes,
      };
    } catch {
      return {
        enabled: false,
        status: 'DETERMINISTIC_FALLBACK',
        device: 'CPU-Standard',
        provider: 'GRAYLINE Rule-Engine (Deterministic)',
        notes: 'GPU inference decoupled; using explainable deterministic triage.',
      };
    }
  },

  // --- Reports ---
  async getReportSummary(): Promise<any> {
    return apiRequest<any>('/reports/summary');
  },

  getExportCsvUrl(): string {
    return `${API_BASE}/reports/patients/export.csv`;
  },
};

// -------------------------------------------------------------
// Real-Time WebSocket Manager
// -------------------------------------------------------------
export type WebSocketEventCallback = (type: string, data: any) => void;

class RealtimeSocketManager {
  private socket: WebSocket | null = null;
  private listeners: WebSocketEventCallback[] = [];
  private reconnectTimeout: any = null;
  private retryDelayMs = 2000;
  private isExplicitlyClosed = false;
  private pollingInterval: any = null;

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isExplicitlyClosed = false;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.retryDelayMs = 2000;
        this.stopPolling();
        this.dispatch('WS_STATUS', { connected: true, timestamp: new Date().toISOString() });
      };

      this.socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this.dispatch(payload.type, payload.data);
        } catch (err) {
          console.warn('WS parse error:', err);
        }
      };

      this.socket.onclose = () => {
        this.dispatch('WS_STATUS', { connected: false });
        if (!this.isExplicitlyClosed) {
          this.startPolling();
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = () => {
        if (this.socket) this.socket.close();
      };
    } catch (err) {
      console.warn('WebSocket init failed:', err);
      this.startPolling();
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.retryDelayMs = Math.min(this.retryDelayMs * 1.5, 15000);
      this.connect();
    }, this.retryDelayMs);
  }

  private startPolling() {
    if (this.pollingInterval) return;
    // Fallback polling every 5s when WebSocket is disconnected
    this.pollingInterval = setInterval(async () => {
      try {
        const patients = await apiClient.getPatients();
        this.dispatch('POLL_UPDATE', { patients });
      } catch {
        // quiet fallback
      }
    }, 5000);
  }

  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  subscribe(callback: WebSocketEventCallback) {
    this.listeners.push(callback);
    return () => {
      const idx = this.listeners.indexOf(callback);
      if (idx !== -1) this.listeners.splice(idx, 1);
    };
  }

  private dispatch(type: string, data: any) {
    this.listeners.forEach((listener) => {
      try {
        listener(type, data);
      } catch (e) {
        console.error('WS Listener error:', e);
      }
    });
  }

  disconnect() {
    this.isExplicitlyClosed = true;
    clearTimeout(this.reconnectTimeout);
    this.stopPolling();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export const realtimeWs = new RealtimeSocketManager();
