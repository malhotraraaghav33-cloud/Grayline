/**
 * Core type definitions for GRAYLINE Tactical Triage & Evacuation System
 */

export type TriagePriority = 'CRITICAL' | 'PRIORITY' | 'STABLE' | 'EXPECTANT';

export type PatientStatus = 
  | 'WAITING_TRIAGE'
  | 'TRIAGED'
  | 'EVAC_PENDING'
  | 'EN_ROUTE'
  | 'DELIVERED';

export type ReviewStatus = 'PENDING' | 'VERIFIED' | 'OVERRIDDEN';

export interface VitalObservation {
  timestamp: string;
  heartRate: number; // bpm
  spO2: number; // %
  systolicBP: number; // mmHg
  diastolicBP: number; // mmHg
  respiratoryRate: number; // /min
  temperature: number; // °C
  gcs?: number; // Glasgow Coma Scale (3-15)
  painLevel?: number; // 0-10
}

export interface Patient {
  id: string; // e.g. P-101
  incidentId: string; // e.g. INC-07-ALFA
  callsign?: string; // Fictional unit e.g. "Echo 2-1"
  injurySummary: string; // Clinical presentation
  triagePriority: TriagePriority;
  previousPriority?: TriagePriority;
  status: PatientStatus;
  
  // Current telemetry
  heartRate: number;
  spO2: number;
  systolicBP: number;
  diastolicBP: number;
  respiratoryRate: number;
  temperature: number;
  gcs: number;
  painLevel: number;
  
  tourniquetApplied: boolean;
  tourniquetTime?: string; // e.g. "13:45Z"
  tourniquetElapsedMinutes?: number;
  
  // Rule explainability
  triageRuleHits: string[]; // ['RULE-01', 'RULE-03']
  triageExplanation: string;
  missingObservations?: string[];
  
  // Review status
  reviewStatus: ReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
  
  // Geospatial
  lat: number;
  lng: number;
  locationName: string;
  
  // Evac logistics
  assignedFacilityId?: string;
  assignedTransport?: string; // e.g. 'ROTOR-02' or 'GROUND-CONVOY-B'
  evacPriorityRank?: number;
  
  // Historical
  observationHistory: VitalObservation[];
  lastObservationTimestamp: string;
}

export type FacilityType = 
  | 'FORWARD_SURGICAL' 
  | 'REGIONAL_TRAUMA' 
  | 'CLINIC' 
  | 'AUXILIARY_DEPOT';

export interface MedicalFacility {
  id: string; // e.g. MED-01
  code: string;
  name: string;
  type: FacilityType;
  lat: number;
  lng: number;
  totalCapacity: number;
  occupiedBeds: number;
  icuCapacity: number;
  icuOccupied: number;
  surgicalTheaters: number;
  bloodUnitsAvailable: number;
  status: 'OPERATIONAL' | 'SURGE_WARNING' | 'CRITICAL_CAPACITY' | 'OFFLINE';
  receivingStatus: boolean;
  specialties: string[];
  lastUpdated: string;
}

export type HazardCategory = 
  | 'STRUCTURAL' 
  | 'DEBRIS' 
  | 'HAZMAT' 
  | 'FLOOD' 
  | 'POWER_GRID' 
  | 'HOSTILE_ACTION';

export type HazardSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Hazard {
  id: string; // e.g. HZ-021
  code: string;
  category: HazardCategory;
  title: string;
  locationDescription: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  severity: HazardSeverity;
  description: string;
  reportedTimestamp: string;
  verifiedTimestamp?: string;
  verificationStatus: 'VERIFIED' | 'UNVERIFIED';
  verifiedBy?: string;
  status: 'ACTIVE' | 'RESOLVED';
  blocksRoadId?: string; // Associated road segment ID if blocked
  estimatedClearHours?: number;
}

export interface RoadNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  elevationMeters: number;
  isFacility?: boolean;
  facilityId?: string;
}

export interface RoadEdge {
  id: string; // e.g. RD-HWY12-SEG1
  fromNodeId: string;
  toNodeId: string;
  name: string;
  distanceKm: number;
  speedLimitKmh: number;
  isBlocked: boolean;
  blockedReason?: string;
  hazardId?: string;
  surfaceType: 'PAVED' | 'UNPAVED' | 'MOUNTAIN_PASS' | 'BRIDGED';
}

export interface CalculatedRoute {
  originId: string;
  destinationId: string;
  pathNodeIds: string[];
  pathCoordinates: [number, number][];
  totalDistanceKm: number;
  estimatedTimeMinutes: number;
  isViable: boolean;
  avoidedHazards: string[];
  usedBypass: boolean;
  explanation: string;
  roadSegments: string[];
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  zuluTime: string;
  category: 'TRIAGE' | 'VITALS' | 'HAZARD' | 'FACILITY' | 'EVAC' | 'SIM' | 'SYSTEM' | 'MASCAL';
  title: string;
  detail: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';
  patientId?: string;
  facilityId?: string;
  hazardId?: string;
}

export interface QueuedSyncItem {
  id: string;
  action: 'UPDATE_PATIENT' | 'ADD_HAZARD' | 'RESOLVE_HAZARD' | 'ASSIGN_EVAC' | 'UPDATE_TRIAGE';
  targetId: string;
  data: any;
  queuedAt: string;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  retryCount: number;
}
