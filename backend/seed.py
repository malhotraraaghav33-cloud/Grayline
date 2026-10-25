import json
from datetime import datetime
from sqlalchemy.orm import Session
from backend.models import (
    User, Patient, VitalObservation, MedicalFacility, Hazard, 
    RoadNode, RoadEdge, TimelineEvent, IncidentStatus
)
from backend.auth import get_password_hash
from backend.triage import evaluate_patient_triage

def seed_database(db: Session):
    # 1. Users
    if db.query(User).count() == 0:
        users = [
            User(
                username="admin",
                email="admin@grayline.mil.test",
                hashed_password=get_password_hash("tactical_admin_pass"),
                role="admin",
                full_name="Col. R. Vance (TOC Commander)"
            ),
            User(
                username="operator",
                email="operator@grayline.mil.test",
                hashed_password=get_password_hash("tacmed_operator_pass"),
                role="operator",
                full_name="Maj. V. Chen (TAC-MED 04)"
            ),
            User(
                username="viewer",
                email="viewer@grayline.mil.test",
                hashed_password=get_password_hash("guest_viewer_pass"),
                role="viewer",
                full_name="Sgt. K. Reeves (Field Observer)"
            )
        ]
        db.add_all(users)
        db.commit()

    # 2. Incident Status
    if db.query(IncidentStatus).count() == 0:
        inc = IncidentStatus(
            code="INC-07-TACTICAL",
            title="FIELD RESPONSE 07 // SECTOR 4",
            mascal_active=False,
            sys_net_security="SECURE // 99.8%"
        )
        db.add(inc)
        db.commit()

    # 3. Medical Facilities
    if db.query(MedicalFacility).count() == 0:
        facilities = [
            MedicalFacility(
                id="MED-01",
                code="FST-ALPHA",
                name="Forward Surgical Team Alpha",
                type="FORWARD_SURGICAL",
                lat=34.2250,
                lng=-118.4720,
                total_capacity=25,
                occupied_beds=21,
                icu_capacity=6,
                icu_occupied=4,
                surgical_theaters=2,
                blood_units_available=14,
                status="SURGE_WARNING",
                receiving_status=True,
                specialties=json.dumps(["Damage Control Surgery", "Blood Resuscitation", "Airway Intervention"]),
                last_updated="14:31:00Z"
            ),
            MedicalFacility(
                id="MED-02",
                code="TRAUMA-02",
                name="Regional Trauma Center (Bravo)",
                type="REGIONAL_TRAUMA",
                lat=34.2480,
                lng=-118.4200,
                total_capacity=80,
                occupied_beds=36,
                icu_capacity=24,
                icu_occupied=6,
                surgical_theaters=6,
                blood_units_available=68,
                status="OPERATIONAL",
                receiving_status=True,
                specialties=json.dumps(["Neurosurgery", "Orthopedic Reconstruction", "Burn Center", "Cardiothoracic"]),
                last_updated="14:30:15Z"
            ),
            MedicalFacility(
                id="MED-03",
                code="CLINIC-FOXTROT",
                name="Clinic Foxtrot (Sector 4 Aid Station)",
                type="CLINIC",
                lat=34.1950,
                lng=-118.4450,
                total_capacity=15,
                occupied_beds=14,
                icu_capacity=2,
                icu_occupied=2,
                surgical_theaters=0,
                blood_units_available=3,
                status="CRITICAL_CAPACITY",
                receiving_status=False,
                specialties=json.dumps(["Minor Trauma", "Hypothermia Rewarming", "Wound Debridement"]),
                last_updated="14:28:40Z"
            ),
            MedicalFacility(
                id="MED-04",
                code="DEPOT-04",
                name="Auxiliary Med Depot & Evac Staging",
                type="AUXILIARY_DEPOT",
                lat=34.1750,
                lng=-118.4900,
                total_capacity=40,
                occupied_beds=12,
                icu_capacity=4,
                icu_occupied=1,
                surgical_theaters=1,
                blood_units_available=22,
                status="OPERATIONAL",
                receiving_status=True,
                specialties=json.dumps(["Holding Ward", "Aeromedical Evacuation Staging", "Decontamination"]),
                last_updated="14:25:00Z"
            )
        ]
        db.add_all(facilities)
        db.commit()

    # 4. Hazards
    if db.query(Hazard).count() == 0:
        hazards = [
            Hazard(
                id="HZ-021",
                code="HZ-021",
                category="STRUCTURAL",
                title="HWY 12 Bridge Structural Collapse",
                location_description="Waypoint Charlie / HWY 12 Mile Marker 4.2",
                lat=34.2120,
                lng=-118.4600,
                radius_meters=250,
                severity="HIGH",
                description="Bridge structural span failure. Arterial road completely impassable to wheeled vehicles and heavy ambulances. Est. clear: 4.5h.",
                reported_timestamp="14:12:00Z",
                verified_timestamp="14:20:44Z",
                verification_status="VERIFIED",
                verified_by="RECON 2 TEAM",
                status="ACTIVE",
                blocks_road_id="RD-HWY12-BRIDGE",
                estimated_clear_hours=4.5
            ),
            Hazard(
                id="HZ-024",
                code="HZ-024",
                category="DEBRIS",
                title="Orchard Valley Rock & Debris Slide",
                location_description="North Fork Road, East Access Cut",
                lat=34.2320,
                lng=-118.4410,
                radius_meters=180,
                severity="MEDIUM",
                description="Rock debris blocking right lane. Single-lane slow passage permitted with military escorts.",
                reported_timestamp="14:15:30Z",
                verified_timestamp="14:22:10Z",
                verification_status="VERIFIED",
                verified_by="ENGINEER SQUAD 3",
                status="ACTIVE",
                blocks_road_id="RD-NORTH-FORK",
                estimated_clear_hours=2.0
            ),
            Hazard(
                id="HZ-028",
                code="HZ-028",
                category="POWER_GRID",
                title="Power Grid Sector 4B Feeder Failure",
                location_description="Sector 4B Substation Grid Point Gamma",
                lat=34.1980,
                lng=-118.4350,
                radius_meters=500,
                severity="MEDIUM",
                description="Local feeder substation failure. Backup generators online at auxiliary rally points. Street illumination down.",
                reported_timestamp="14:18:00Z",
                verification_status="UNVERIFIED",
                status="ACTIVE"
            ),
            Hazard(
                id="HZ-031",
                code="HZ-031",
                category="FLOOD",
                title="Flash Flood Washout Sector Creek",
                location_description="South Culvert Crossing at Ridge Road",
                lat=34.1850,
                lng=-118.4750,
                radius_meters=300,
                severity="HIGH",
                description="Culvert breach causing water surge over lower valley access route. Ford depth >1.2m.",
                reported_timestamp="14:05:00Z",
                verified_timestamp="14:15:00Z",
                verification_status="VERIFIED",
                verified_by="PATROL ALFA",
                status="ACTIVE",
                blocks_road_id="RD-VALLEY-CULVERT",
                estimated_clear_hours=6.0
            ),
            Hazard(
                id="HZ-035",
                code="HZ-035",
                category="HAZMAT",
                title="Industrial Solvent Leak Near Rail Spur",
                location_description="West Industrial Siding 9",
                lat=34.2050,
                lng=-118.4950,
                radius_meters=150,
                severity="LOW",
                description="Spill reported by transport drone. Wind blowing SSW away from triage corridor.",
                reported_timestamp="14:27:00Z",
                verification_status="UNVERIFIED",
                status="ACTIVE"
            )
        ]
        db.add_all(hazards)
        db.commit()

    # 5. Road Nodes & Edges
    if db.query(RoadNode).count() == 0:
        nodes = [
            RoadNode(id="WP-SOUTH", name="South Valley Gateway", lat=34.1700, lng=-118.5100, elevation_meters=380),
            RoadNode(id="CAS-112", name="Casualty Site P-112 (Blast Site)", lat=34.1880, lng=-118.4950, elevation_meters=395),
            RoadNode(id="CAS-104", name="Casualty Site P-104 (Orchard Jct)", lat=34.2010, lng=-118.4710, elevation_meters=412),
            RoadNode(id="CAS-108", name="Casualty Site P-108 (Mid Valley)", lat=34.2150, lng=-118.4550, elevation_meters=425),
            RoadNode(id="WP-CHARLIE", name="Waypoint Charlie (Bridge West)", lat=34.2110, lng=-118.4620, elevation_meters=418),
            RoadNode(id="WP-CHARLIE-EAST", name="Waypoint Charlie (Bridge East)", lat=34.2130, lng=-118.4580, elevation_meters=418),
            RoadNode(id="BYPASS-4C", name="Bypass 4C North Trail", lat=34.2280, lng=-118.4650, elevation_meters=460),
            RoadNode(id="MED-01", name="MED-01 Forward Surgical Team", lat=34.2250, lng=-118.4720, elevation_meters=430, is_facility=True, facility_id="MED-01"),
            RoadNode(id="MED-02", name="MED-02 Regional Trauma Center", lat=34.2480, lng=-118.4200, elevation_meters=390, is_facility=True, facility_id="MED-02"),
            RoadNode(id="MED-03", name="MED-03 Clinic Foxtrot", lat=34.1950, lng=-118.4450, elevation_meters=405, is_facility=True, facility_id="MED-03"),
            RoadNode(id="MED-04", name="MED-04 Auxiliary Depot", lat=34.1750, lng=-118.4900, elevation_meters=385, is_facility=True, facility_id="MED-04"),
            RoadNode(id="WP-EAST-FORK", name="East Fork Junction", lat=34.2380, lng=-118.4350, elevation_meters=410),
            RoadNode(id="ISOLATED-OUTPOST-X", name="Cutoff Outpost X (No Roads)", lat=34.2600, lng=-118.5300, elevation_meters=750)
        ]
        db.add_all(nodes)
        db.commit()

    if db.query(RoadEdge).count() == 0:
        edges = [
            RoadEdge(id="RD-01", from_node_id="WP-SOUTH", to_node_id="CAS-112", name="South Approach Rd", distance_km=2.6, speed_limit_kmh=60, is_blocked=False, surface_type="PAVED"),
            RoadEdge(id="RD-02", from_node_id="CAS-112", to_node_id="CAS-104", name="HWY 12 Lower Corridor", distance_km=2.8, speed_limit_kmh=55, is_blocked=False, surface_type="PAVED"),
            RoadEdge(id="RD-WEST-PASS", from_node_id="CAS-104", to_node_id="MED-01", name="West Medical Access Rd", distance_km=3.1, speed_limit_kmh=50, is_blocked=False, surface_type="PAVED"),
            RoadEdge(id="RD-HWY12-APPROACH", from_node_id="CAS-104", to_node_id="WP-CHARLIE", name="HWY 12 Bridge Approach", distance_km=1.4, speed_limit_kmh=55, is_blocked=False, surface_type="PAVED"),
            RoadEdge(id="RD-HWY12-BRIDGE", from_node_id="WP-CHARLIE", to_node_id="WP-CHARLIE-EAST", name="HWY 12 Waypoint Charlie Bridge", distance_km=0.6, speed_limit_kmh=45, is_blocked=True, blocked_reason="HZ-021: Bridge structural collapse", hazard_id="HZ-021", surface_type="BRIDGED"),
            RoadEdge(id="RD-BYPASS-01", from_node_id="MED-01", to_node_id="BYPASS-4C", name="Bypass 4C Ridge Trail (West)", distance_km=1.8, speed_limit_kmh=40, is_blocked=False, surface_type="MOUNTAIN_PASS"),
            RoadEdge(id="RD-BYPASS-02", from_node_id="BYPASS-4C", to_node_id="WP-EAST-FORK", name="Bypass 4C Ridge Trail (East)", distance_km=3.4, speed_limit_kmh=40, is_blocked=False, surface_type="MOUNTAIN_PASS"),
            RoadEdge(id="RD-05", from_node_id="WP-CHARLIE-EAST", to_node_id="CAS-108", name="HWY 12 Central Segment", distance_km=1.1, speed_limit_kmh=50, is_blocked=False, surface_type="PAVED"),
            RoadEdge(id="RD-06", from_node_id="CAS-108", to_node_id="WP-EAST-FORK", name="North Fork Valley Rd", distance_km=3.2, speed_limit_kmh=45, is_blocked=False, surface_type="PAVED"),
            RoadEdge(id="RD-07", from_node_id="WP-EAST-FORK", to_node_id="MED-02", name="Regional Arterial North", distance_km=2.2, speed_limit_kmh=65, is_blocked=False, surface_type="PAVED"),
            RoadEdge(id="RD-08", from_node_id="CAS-104", to_node_id="MED-03", name="Foxtrot Connector Rd", distance_km=2.9, speed_limit_kmh=45, is_blocked=False, surface_type="PAVED"),
            RoadEdge(id="RD-09", from_node_id="CAS-112", to_node_id="MED-04", name="Depot Access Cut", distance_km=1.9, speed_limit_kmh=45, is_blocked=False, surface_type="UNPAVED")
        ]
        db.add_all(edges)
        db.commit()

    # 6. Patients (24 Tactical Fictional Patients)
    if db.query(Patient).count() == 0:
        raw_patients = [
            ("P-104", "INC-07-ALFA", "Bravo 2-4", "Tension Pneumothorax Suspected // Penetrating chest trauma", 138, 88, 82, 54, 28, 36.8, 14, 9, False, None, 0, 34.2010, -118.4710, "Orchard Valley Jct", "MED-01", "AIR-EVAC (ROTOR-01)", "PENDING", None, None),
            ("P-112", "INC-07-ALFA", "Sierra 1-1", "Blast Polytrauma // Hemodynamic Collapse // Closed Head Injury", 42, 91, 76, 40, 9, 35.6, 7, 3, True, "13:50Z", 42, 34.1880, -118.4950, "Blast Site Sector 4A", "MED-02", "REQUEST ROTOR 02", "VERIFIED", "MAJ. V. CHEN", "14:20Z"),
            ("P-108", "INC-07-ALFA", "Kilo 4-2", "Shrapnel Extremity (R Femoral) // Tourniquet Applied", 110, 94, 104, 68, 20, 37.1, 15, 8, True, "13:45Z", 47, 34.2150, -118.4550, "Mid Valley CP", "MED-02", "MED-02 GROUND CONVOY B", "VERIFIED", "CAPT. D. MILLER", "14:10Z"),
            ("P-101", "INC-07-ALFA", "Echo 2-1", "Compound open tibia fracture with controlled hemorrhage", 108, 96, 118, 74, 18, 37.0, 15, 9, False, None, 0, 34.2040, -118.4680, "Orchard Valley West Access", "MED-02", None, "PENDING", None, None),
            ("P-102", "INC-07-ALFA", "Echo 2-2", "Superficial shrapnel lacerations to forearm, ambulatory", 78, 98, 122, 78, 14, 36.9, 15, 4, False, None, 0, 34.2050, -118.4690, "Orchard Valley Holding", "MED-04", None, "VERIFIED", "SGT. K. REEVES", "14:15Z"),
            ("P-103", "INC-07-ALFA", "Echo 2-3", "Smoke inhalation, persistent cough, soot in pharynx", 124, 87, 102, 64, 30, 37.4, 13, 6, False, None, 0, 34.2060, -118.4720, "Structure Fire Sector 4", "MED-01", None, "PENDING", None, None),
            ("P-105", "INC-07-ALFA", "Bravo 2-1", "Abdominal evisceration, penetrating fragmentation", 132, 93, 86, 52, 26, 36.2, 12, 10, False, None, 0, 34.2025, -118.4740, "Orchard Valley Jct", "MED-01", "AIR-EVAC (ROTOR-01)", "VERIFIED", "MAJ. V. CHEN", "14:18Z"),
            ("P-106", "INC-07-ALFA", "Bravo 2-2", "Second degree thermal burns (18% TBSA: arms & torso)", 114, 96, 112, 72, 20, 37.6, 15, 9, False, None, 0, 34.2030, -118.4735, "Orchard Valley Field CCP", "MED-02", None, "PENDING", None, None),
            ("P-107", "INC-07-ALFA", "Kilo 4-1", "Blunt chest trauma, suspected rib fractures, shallow respiration", 104, 93, 124, 80, 24, 36.8, 15, 7, False, None, 0, 34.2140, -118.4570, "Mid Valley CP", "MED-02", None, "VERIFIED", "CAPT. D. MILLER", "14:16Z"),
            ("P-109", "INC-07-ALFA", "Kilo 4-3", "Acoustic trauma, ruptured tympanic membrane, disoriented", 84, 98, 128, 82, 16, 36.8, 14, 5, False, None, 0, 34.2160, -118.4540, "Mid Valley CP", "MED-04", None, "VERIFIED", "SGT. K. REEVES", "14:18Z"),
            ("P-110", "INC-07-ALFA", "Sierra 1-2", "Crush syndrome bilateral lower extremities, pinned under concrete", 128, 92, 88, 56, 25, 36.1, 14, 9, False, None, 0, 34.1895, -118.4930, "Sector 4 Collapse Zone", "MED-01", None, "PENDING", None, None),
            ("P-111", "INC-07-ALFA", "Sierra 1-3", "Mild concussion, periorbital contusion", 72, 99, 118, 76, 15, 36.7, 15, 3, False, None, 0, 34.1870, -118.4960, "Sector 4 Staging Bay", "MED-04", None, "VERIFIED", "SGT. K. REEVES", "14:22Z"),
            ("P-113", "INC-07-BRAVO", "Tango 3-1", "Traumatic amputation left wrist, pressure bandage holding", 112, 95, 106, 68, 21, 36.9, 15, 8, True, "14:05Z", 25, 34.2210, -118.4620, "North Trail Outpost", "MED-02", None, "VERIFIED", "CAPT. D. MILLER", "14:15Z"),
            ("P-114", "INC-07-BRAVO", "Tango 3-2", "Ankle sprain / soft tissue contusion", 76, 98, 124, 80, 14, 36.8, 15, 4, False, None, 0, 34.2220, -118.4630, "North Trail Outpost", "MED-03", None, "PENDING", None, None),
            ("P-115", "INC-07-BRAVO", "Tango 3-3", "Severe chemical eye irritation & conjunctivitis", 98, 97, 130, 84, 18, 37.0, 15, 8, False, None, 0, 34.2230, -118.4640, "North Trail Outpost", "MED-03", None, "PENDING", None, None),
            ("P-116", "INC-07-CHARLIE", "Victor 5-1", "Hypothermia from creek immersion, shivering suppressed", 54, 92, 98, 62, 11, 33.8, 13, 2, False, None, 0, 34.1840, -118.4760, "Sector Creek Culvert", "MED-03", None, "PENDING", None, None),
            ("P-117", "INC-07-CHARLIE", "Victor 5-2", "Exhaustion and minor hypothermia, shivering present", 88, 97, 126, 82, 16, 35.4, 15, 2, False, None, 0, 34.1845, -118.4755, "Sector Creek Culvert", "MED-04", None, "VERIFIED", "SGT. K. REEVES", "14:15Z"),
            ("P-118", "INC-07-DELTA", "Delta 1-1", "Penetrating shrapnel neck wound, expanding hematoma", 136, 89, 84, 50, 29, 36.7, 12, 9, False, None, 0, 34.2080, -118.4650, "Highway 12 Junction North", "MED-01", "AIR-EVAC (ROTOR-01)", "VERIFIED", "MAJ. V. CHEN", "14:20Z"),
            ("P-119", "INC-07-DELTA", "Delta 1-2", "Bilateral closed femur fractures, pallor and diaphoresis", 129, 93, 88, 54, 24, 36.5, 14, 10, False, None, 0, 34.2090, -118.4640, "Highway 12 Junction North", "MED-02", None, "PENDING", None, None),
            ("P-120", "INC-07-DELTA", "Delta 1-3", "Laceration scalp with brisk bleeding now controlled by pressure", 106, 97, 114, 72, 17, 37.0, 15, 6, False, None, 0, 34.2100, -118.4630, "Highway 12 Junction North", "MED-04", None, "VERIFIED", "CAPT. D. MILLER", "14:24Z"),
            ("P-121", "INC-07-ECHO", "Zulu 9-1", "Dislocated right shoulder, neurovascular intact", 86, 98, 122, 78, 16, 36.9, 15, 7, False, None, 0, 34.2340, -118.4380, "North Fork Checkpoint", "MED-03", None, "VERIFIED", "SGT. K. REEVES", "14:20Z"),
            ("P-122", "INC-07-ECHO", "Zulu 9-2", "Corneal foreign body sensation, uninjured vitals", 74, 99, 116, 74, 14, 36.8, 15, 4, False, None, 0, 34.2350, -118.4370, "North Fork Checkpoint", "MED-04", None, "PENDING", None, None),
            ("P-123", "INC-07-FOXTROT", "Ranger 4-1", "Dehydration & heat exhaustion, core temp 38.6°C", 118, 96, 104, 64, 22, 38.6, 14, 4, False, None, 0, 34.2420, -118.4280, "East Ridge Recon Post", "MED-02", None, "PENDING", None, None),
            ("P-124", "INC-07-FOXTROT", "Ranger 4-2", "Missing telemetry readings - field transmitter signal erratic", 92, 95, 110, 70, 16, 37.0, 15, 3, False, None, 0, 34.2430, -118.4270, "East Ridge Recon Post", "MED-02", None, "PENDING", None, None)
        ]

        patients_objs = []
        now_iso = datetime.utcnow().isoformat() + "Z"

        for row in raw_patients:
            (p_id, inc_id, callsign, injury, hr, spo2, sbp, dbp, rr, temp, gcs, pain, tq, tq_t, tq_m, lat, lng, loc, fac, trans, rev_st, rev_by, rev_at) = row
            triage_res = evaluate_patient_triage(hr, spo2, sbp, dbp, rr, temp, gcs, pain, tq, tq_m)
            p = Patient(
                id=p_id,
                incident_id=inc_id,
                callsign=callsign,
                injury_summary=injury,
                triage_priority=triage_res["priority"],
                status="WAITING_TRIAGE" if triage_res["priority"] == "CRITICAL" else "TRIAGED",
                heart_rate=hr,
                spo2=spo2,
                systolic_bp=sbp,
                diastolic_bp=dbp,
                respiratory_rate=rr,
                temperature=temp,
                gcs=gcs,
                pain_level=pain,
                tourniquet_applied=tq,
                tourniquet_time=tq_t,
                tourniquet_elapsed_mins=tq_m,
                triage_rule_hits=json.dumps(triage_res["rule_hits"]),
                triage_explanation=triage_res["explanation"],
                missing_observations=json.dumps(triage_res["missing_observations"]),
                review_status=rev_st,
                reviewed_by=rev_by,
                reviewed_at=rev_at,
                lat=lat,
                lng=lng,
                location_name=loc,
                assigned_facility_id=fac,
                assigned_transport=trans,
                last_observation_timestamp=now_iso
            )
            patients_objs.append(p)

        db.add_all(patients_objs)
        db.commit()

        # Seed initial observation records for sparklines
        for p in patients_objs:
            obs = VitalObservation(
                patient_id=p.id,
                timestamp="14:25Z",
                heart_rate=p.heart_rate,
                spo2=p.spo2,
                systolic_bp=p.systolic_bp,
                diastolic_bp=p.diastolic_bp,
                respiratory_rate=p.respiratory_rate,
                temperature=p.temperature,
                gcs=p.gcs,
                pain_level=p.pain_level
            )
            db.add(obs)
        db.commit()

    # 7. Timeline events
    if db.query(TimelineEvent).count() == 0:
        events = [
            TimelineEvent(id="EVT-1001", zulu_time="14:28:10Z", category="VITALS", title="P-104 SpO2 dropped below 90%", detail="Oxygen saturation declined from 90% to 88%. Auto-elevated to CRITICAL / RED via RULE-01.", severity="CRITICAL", patient_id="P-104"),
            TimelineEvent(id="EVT-1002", zulu_time="14:25:02Z", category="FACILITY", title="MED-01 accepted air ambulance query", detail="Forward Surgical Team Alpha confirmed Trauma Bed 03 availability for incoming rotary evac.", severity="SUCCESS", facility_id="MED-01"),
            TimelineEvent(id="EVT-1003", zulu_time="14:20:44Z", category="HAZARD", title="HZ-021 verified road closure on HWY 12 Bridge", detail="Recon Team 2 confirmed bridge structural collapse. Waypoint Charlie closed to heavy vehicles.", severity="WARNING", hazard_id="HZ-021"),
            TimelineEvent(id="EVT-1004", zulu_time="14:15:30Z", category="EVAC", title="Dijkstra route recalculated via Bypass 4C", detail="Routing engine diverted evacuation corridor around HWY 12 Bridge (+3.2 km, ETA 14 min).", severity="INFO"),
            TimelineEvent(id="EVT-1005", zulu_time="14:10:00Z", category="SYSTEM", title="Tactical Mesh Server Bootstrapped", detail="PostgreSQL/SQLite database armed. Offline mesh sync active.", severity="INFO")
        ]
        db.add_all(events)
        db.commit()
