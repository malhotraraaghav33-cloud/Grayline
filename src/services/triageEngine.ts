/**
 * Explainable Rule-Based Demonstration Triage Engine
 * NOTE: For demonstration / defense-exercise simulation only. 
 * Does NOT replace professional clinical medical triage protocols.
 */

import { Patient, TriagePriority } from '../types';

export interface TriageRuleDefinition {
  id: string;
  name: string;
  category: 'AIRWAY_BREATHING' | 'CIRCULATION' | 'NEURO' | 'TRAUMA_MECHANISM';
  targetPriority: TriagePriority;
  description: string;
  evaluate: (p: Partial<Patient>) => { matched: boolean; rationale?: string };
}

export const TRIAGE_RULES: TriageRuleDefinition[] = [
  {
    id: 'RULE-01',
    name: 'Severe Hypoxia (<90% SpO2)',
    category: 'AIRWAY_BREATHING',
    targetPriority: 'CRITICAL',
    description: 'Oxygen saturation below 90% indicates impending respiratory failure requiring immediate airway support.',
    evaluate: (p) => {
      if (p.spO2 !== undefined && p.spO2 < 90) {
        return { matched: true, rationale: `SpO2 ${p.spO2}% is dangerously low (<90%)` };
      }
      return { matched: false };
    }
  },
  {
    id: 'RULE-02',
    name: 'Severe Tachypnea or Bradypnea',
    category: 'AIRWAY_BREATHING',
    targetPriority: 'CRITICAL',
    description: 'Respiratory rate >28/min or <10/min indicates severe physiological exhaustion or respiratory depression.',
    evaluate: (p) => {
      if (p.respiratoryRate !== undefined) {
        if (p.respiratoryRate > 28) {
          return { matched: true, rationale: `Respiratory rate ${p.respiratoryRate}/min indicates severe tachypnea (>28)` };
        }
        if (p.respiratoryRate < 10) {
          return { matched: true, rationale: `Respiratory rate ${p.respiratoryRate}/min indicates bradypnea/hypoventilation (<10)` };
        }
      }
      return { matched: false };
    }
  },
  {
    id: 'RULE-03',
    name: 'Hemodynamic Shock / Decompensation',
    category: 'CIRCULATION',
    targetPriority: 'CRITICAL',
    description: 'Systolic blood pressure <90 mmHg combined with severe tachycardia (>120 bpm) or bradycardia (<50 bpm).',
    evaluate: (p) => {
      const sbp = p.systolicBP;
      const hr = p.heartRate;
      if (sbp !== undefined && hr !== undefined) {
        if (sbp < 90 && hr > 120) {
          return { matched: true, rationale: `Hypotension (SBP ${sbp} mmHg) with compensatory tachycardia (HR ${hr} bpm)` };
        }
        if (sbp < 80 && hr < 50) {
          return { matched: true, rationale: `Critical cardiovascular collapse: severe bradycardia (${hr} bpm) and hypotension (SBP ${sbp})` };
        }
      }
      return { matched: false };
    }
  },
  {
    id: 'RULE-04',
    name: 'Severe Neurological Impairment (GCS <= 8)',
    category: 'NEURO',
    targetPriority: 'CRITICAL',
    description: 'Glasgow Coma Scale <= 8 reflects severe altered mental status requiring airway protection.',
    evaluate: (p) => {
      if (p.gcs !== undefined && p.gcs <= 8) {
        return { matched: true, rationale: `GCS score ${p.gcs} indicates severe brain injury or coma (<=8)` };
      }
      return { matched: false };
    }
  },
  {
    id: 'RULE-05',
    name: 'Tourniquet In-Situ (>45 min elapsed)',
    category: 'CIRCULATION',
    targetPriority: 'PRIORITY',
    description: 'Active tourniquet requires priority surgical stabilization to prevent limb ischemia or reperfusion injury.',
    evaluate: (p) => {
      if (p.tourniquetApplied) {
        const mins = p.tourniquetElapsedMinutes || 0;
        return { matched: true, rationale: `Tourniquet active (${mins} min elapsed), urgent vascular review required` };
      }
      return { matched: false };
    }
  },
  {
    id: 'RULE-06',
    name: 'Moderate Hypoxia (90-93% SpO2)',
    category: 'AIRWAY_BREATHING',
    targetPriority: 'PRIORITY',
    description: 'Oxygen saturation 90-93% requires supplemental oxygen and close monitoring.',
    evaluate: (p) => {
      if (p.spO2 !== undefined && p.spO2 >= 90 && p.spO2 <= 93) {
        return { matched: true, rationale: `Moderate hypoxia with SpO2 ${p.spO2}%` };
      }
      return { matched: false };
    }
  },
  {
    id: 'RULE-07',
    name: 'Tachycardia with Controlled Perfusion',
    category: 'CIRCULATION',
    targetPriority: 'PRIORITY',
    description: 'Heart rate 105-125 bpm with adequate perfusion (SBP >= 95 mmHg), pain or mild volume loss.',
    evaluate: (p) => {
      if (p.heartRate !== undefined && p.heartRate >= 105 && p.heartRate <= 125) {
        return { matched: true, rationale: `Tachycardia (HR ${p.heartRate} bpm) with moderate pain or systemic stress` };
      }
      return { matched: false };
    }
  },
  {
    id: 'RULE-08',
    name: 'Severe Pain / Musculoskeletal Extremity Injury',
    category: 'TRAUMA_MECHANISM',
    targetPriority: 'PRIORITY',
    description: 'Severe pain score (>=8/10) with stable hemodynamic profile.',
    evaluate: (p) => {
      if (p.painLevel !== undefined && p.painLevel >= 8) {
        return { matched: true, rationale: `Severe pain score (${p.painLevel}/10), analgesia and stabilization priority` };
      }
      return { matched: false };
    }
  },
  {
    id: 'RULE-09',
    name: 'Physiologically Stable Baseline',
    category: 'CIRCULATION',
    targetPriority: 'STABLE',
    description: 'Normal range vital signs (HR 60-100, SpO2 >= 95%, SBP 100-140, RR 12-20, GCS 15).',
    evaluate: (p) => {
      const hr = p.heartRate;
      const spo2 = p.spO2;
      const sbp = p.systolicBP;
      const rr = p.respiratoryRate;
      if (
        hr !== undefined && hr >= 55 && hr <= 100 &&
        spo2 !== undefined && spo2 >= 95 &&
        sbp !== undefined && sbp >= 95 && sbp <= 140 &&
        rr !== undefined && rr >= 12 && rr <= 20
      ) {
        return { matched: true, rationale: 'Vitals within normal physiological thresholds' };
      }
      return { matched: false };
    }
  }
];

export interface TriageResult {
  priority: TriagePriority;
  ruleHits: string[];
  explanation: string;
  missingObservations: string[];
  staleMinutes: number;
}

export function evaluateTriage(patient: Partial<Patient>): TriageResult {
  const missing: string[] = [];
  if (patient.heartRate === undefined || patient.heartRate === null) missing.push('Heart Rate');
  if (patient.spO2 === undefined || patient.spO2 === null) missing.push('SpO2');
  if (patient.systolicBP === undefined || patient.systolicBP === null) missing.push('Systolic BP');
  if (patient.respiratoryRate === undefined || patient.respiratoryRate === null) missing.push('Respiratory Rate');

  // Check staleness
  let staleMinutes = 0;
  if (patient.lastObservationTimestamp) {
    const diffMs = Date.now() - new Date(patient.lastObservationTimestamp).getTime();
    staleMinutes = Math.max(0, Math.floor(diffMs / 60000));
  }

  // If major observations are missing, we CANNOT assume stable. Require attention (at least PRIORITY)
  if (missing.length >= 2) {
    return {
      priority: 'PRIORITY',
      ruleHits: ['ALERT-MISSING-DATA'],
      explanation: `Incomplete telemetry: Missing ${missing.join(', ')}. Marked PRIORITY for manual examination.`,
      missingObservations: missing,
      staleMinutes
    };
  }

  const triggeredRules: { rule: TriageRuleDefinition; rationale: string }[] = [];

  for (const rule of TRIAGE_RULES) {
    const res = rule.evaluate(patient);
    if (res.matched) {
      triggeredRules.push({
        rule,
        rationale: res.rationale || rule.name
      });
    }
  }

  // Priority hierarchy: CRITICAL > PRIORITY > STABLE
  const hasCritical = triggeredRules.some(r => r.rule.targetPriority === 'CRITICAL');
  const hasPriority = triggeredRules.some(r => r.rule.targetPriority === 'PRIORITY');

  let assignedPriority: TriagePriority = 'STABLE';
  if (hasCritical) {
    assignedPriority = 'CRITICAL';
  } else if (hasPriority) {
    assignedPriority = 'PRIORITY';
  } else if (patient.gcs && patient.gcs < 3 && patient.respiratoryRate === 0) {
    assignedPriority = 'EXPECTANT';
  }

  const ruleHits = triggeredRules
    .filter(r => r.rule.targetPriority === assignedPriority)
    .map(r => r.rule.id);

  const rationales = triggeredRules
    .filter(r => r.rule.targetPriority === assignedPriority)
    .map(r => r.rationale);

  const explanation = rationales.length > 0 
    ? rationales.join('; ') 
    : (assignedPriority === 'STABLE' ? 'All vital parameters within normal ranges.' : 'General tactical triage classification.');

  return {
    priority: assignedPriority,
    ruleHits: ruleHits.length > 0 ? ruleHits : (assignedPriority === 'STABLE' ? ['RULE-09'] : []),
    explanation,
    missingObservations: missing,
    staleMinutes
  };
}
