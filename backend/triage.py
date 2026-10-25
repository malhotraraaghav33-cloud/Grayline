"""
Explainable, Deterministic Demonstration Triage Engine
NOTICE: Configured strictly for defense-exercise simulation and demonstration.
Not clinically certified. Does not replace professional clinical judgement.
"""

from typing import Dict, Any, List, Optional

TRIAGE_RULES_CATALOG = [
    {
        "id": "RULE-01",
        "name": "Severe Hypoxia (<90% SpO2)",
        "category": "AIRWAY_BREATHING",
        "target_priority": "CRITICAL",
        "description": "Oxygen saturation below 90% indicates severe impairment requiring immediate airway support."
    },
    {
        "id": "RULE-02",
        "name": "Severe Tachypnea or Bradypnea",
        "category": "AIRWAY_BREATHING",
        "target_priority": "CRITICAL",
        "description": "Respiratory rate >28/min or <10/min signals respiratory fatigue or central depression."
    },
    {
        "id": "RULE-03",
        "name": "Hemodynamic Shock / Collapse",
        "category": "CIRCULATION",
        "target_priority": "CRITICAL",
        "description": "Systolic blood pressure <90 mmHg combined with severe tachycardia (>120 bpm) or bradycardia (<50 bpm)."
    },
    {
        "id": "RULE-04",
        "name": "Severe Neurological Coma (GCS <= 8)",
        "category": "NEURO",
        "target_priority": "CRITICAL",
        "description": "Glasgow Coma Scale <= 8 requires immediate airway preservation."
    },
    {
        "id": "RULE-05",
        "name": "Tourniquet In-Situ (>45 min elapsed)",
        "category": "CIRCULATION",
        "target_priority": "PRIORITY",
        "description": "Tourniquet in situ requires urgent surgical review to prevent ischemic necrosis."
    },
    {
        "id": "RULE-06",
        "name": "Moderate Hypoxia (90-93% SpO2)",
        "category": "AIRWAY_BREATHING",
        "target_priority": "PRIORITY",
        "description": "Oxygen saturation between 90% and 93% requires supplemental oxygen and surveillance."
    },
    {
        "id": "RULE-07",
        "name": "Tachycardia / Stress Perfusion",
        "category": "CIRCULATION",
        "target_priority": "PRIORITY",
        "description": "Heart rate between 105 and 125 bpm indicates systemic stress or pain."
    },
    {
        "id": "RULE-08",
        "name": "Severe Extremity Pain / Orthopedic Trauma",
        "category": "TRAUMA_MECHANISM",
        "target_priority": "PRIORITY",
        "description": "Pain rated >= 8/10 with intact perfusion requires analgesia and splinting."
    },
    {
        "id": "RULE-09",
        "name": "Physiologically Stable Baseline",
        "category": "CIRCULATION",
        "target_priority": "STABLE",
        "description": "Vital signs within normal parameters (HR 55-100, SpO2 >=95%, SBP 95-140, RR 12-20)."
    }
]

def evaluate_patient_triage(
    heart_rate: Optional[int],
    spo2: Optional[int],
    systolic_bp: Optional[int],
    diastolic_bp: Optional[int],
    respiratory_rate: Optional[int],
    temperature: Optional[float] = None,
    gcs: Optional[int] = None,
    pain_level: Optional[int] = None,
    tourniquet_applied: bool = False,
    tourniquet_elapsed_mins: int = 0
) -> Dict[str, Any]:
    missing: List[str] = []
    if heart_rate is None: missing.append("heart_rate")
    if spo2 is None: missing.append("spo2")
    if systolic_bp is None: missing.append("systolic_bp")
    if respiratory_rate is None: missing.append("respiratory_rate")

    # If critical telemetry is missing, we must NOT assume stable
    if len(missing) >= 2:
        return {
            "priority": "PRIORITY",
            "rule_hits": ["ALERT-MISSING-DATA"],
            "explanation": f"Incomplete telemetry: Missing {', '.join(missing)}. Marked PRIORITY for manual examination.",
            "missing_observations": missing,
            "is_clinically_certified": False
        }

    critical_hits: List[str] = []
    priority_hits: List[str] = []
    stable_hits: List[str] = []
    rationales: List[str] = []

    # Check Rule 01: SpO2 < 90%
    if spo2 is not None and spo2 < 90:
        critical_hits.append("RULE-01")
        rationales.append(f"Severe hypoxia: SpO2 {spo2}% (<90%)")

    # Check Rule 02: RR > 28 or < 10
    if respiratory_rate is not None:
        if respiratory_rate > 28:
            critical_hits.append("RULE-02")
            rationales.append(f"Severe tachypnea: RR {respiratory_rate}/min (>28)")
        elif respiratory_rate < 10:
            critical_hits.append("RULE-02")
            rationales.append(f"Severe bradypnea: RR {respiratory_rate}/min (<10)")

    # Check Rule 03: Shock
    if systolic_bp is not None and heart_rate is not None:
        if systolic_bp < 90 and heart_rate > 120:
            critical_hits.append("RULE-03")
            rationales.append(f"Cardiovascular shock: SBP {systolic_bp} mmHg with HR {heart_rate} bpm")
        elif systolic_bp < 80 and heart_rate < 50:
            critical_hits.append("RULE-03")
            rationales.append(f"Hemodynamic collapse: SBP {systolic_bp} mmHg with profound bradycardia {heart_rate} bpm")

    # Check Rule 04: GCS <= 8
    if gcs is not None and gcs <= 8:
        critical_hits.append("RULE-04")
        rationales.append(f"Severe neurological impairment: GCS {gcs} (<=8)")

    # Check Rule 05: Tourniquet
    if tourniquet_applied:
        priority_hits.append("RULE-05")
        rationales.append(f"Active tourniquet in-situ ({tourniquet_elapsed_mins} min elapsed)")

    # Check Rule 06: Moderate hypoxia
    if spo2 is not None and 90 <= spo2 <= 93:
        priority_hits.append("RULE-06")
        rationales.append(f"Moderate hypoxia: SpO2 {spo2}%")

    # Check Rule 07: Tachycardia
    if heart_rate is not None and 105 <= heart_rate <= 125:
        priority_hits.append("RULE-07")
        rationales.append(f"Tachycardia: HR {heart_rate} bpm")

    # Check Rule 08: Severe pain
    if pain_level is not None and pain_level >= 8:
        priority_hits.append("RULE-08")
        rationales.append(f"Severe pain score: {pain_level}/10")

    # Check Rule 09: Normal Baseline
    if (
        heart_rate is not None and 55 <= heart_rate <= 100 and
        spo2 is not None and spo2 >= 95 and
        systolic_bp is not None and 95 <= systolic_bp <= 140 and
        respiratory_rate is not None and 12 <= respiratory_rate <= 20
    ):
        stable_hits.append("RULE-09")
        rationales.append("All primary vitals within normal baseline")

    if critical_hits:
        assigned = "CRITICAL"
        hits = critical_hits
    elif priority_hits:
        assigned = "PRIORITY"
        hits = priority_hits
    else:
        assigned = "STABLE"
        hits = stable_hits or ["RULE-09"]

    explanation = "; ".join(rationales) if rationales else "Normal tactical physiological parameters."

    return {
        "priority": assigned,
        "rule_hits": hits,
        "explanation": explanation,
        "missing_observations": missing,
        "is_clinically_certified": False
    }
