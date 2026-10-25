"""
GPU-Ready Inference Service Interface
Provides an abstraction client for optional external containerized ML/LLM models.
Defaults to local deterministic triage algorithms if no GPU endpoint is provided.
"""

import httpx
from typing import Dict, Any, Optional
from backend.config import settings
from backend.triage import evaluate_patient_triage

class InferenceServiceClient:
    def __init__(self):
        self.endpoint_url = settings.INFERENCE_SERVICE_URL
        self.api_key = settings.INFERENCE_SERVICE_API_KEY
        self.timeout = settings.INFERENCE_TIMEOUT_SECONDS

    @property
    def is_configured(self) -> bool:
        return bool(self.endpoint_url and self.endpoint_url.strip())

    async def check_gpu_status(self) -> Dict[str, Any]:
        if not self.is_configured:
            return {
                "gpu_service_configured": False,
                "service_url": None,
                "status": "STANDBY_UNCONFIGURED",
                "hardware_acceleration": "CPU_DETERMINISTIC_LOCAL",
                "validation_status": "UNVALIDATED_DEMO_ALGORITHM",
                "notice": "No GPU inference service configured; using verified deterministic demo triage rules."
            }

        # Attempt health ping to the external GPU inference server
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                headers = {}
                if self.api_key:
                    headers["Authorization"] = f"Bearer {self.api_key}"
                resp = await client.get(f"{self.endpoint_url}/health", headers=headers)
                if resp.status_code == 200:
                    data = resp.json() if resp.headers.get("content-type") == "application/json" else {}
                    return {
                        "gpu_service_configured": True,
                        "service_url": self.endpoint_url,
                        "status": "CONNECTED",
                        "hardware_acceleration": data.get("hardware", "EXTERNAL_GPU_INFERENCE"),
                        "validation_status": "CONNECTED_UNVALIDATED_PILOT",
                        "notice": "GPU inference service connected. All outputs require human clinical validation."
                    }
                else:
                    return {
                        "gpu_service_configured": True,
                        "service_url": self.endpoint_url,
                        "status": f"UNAVAILABLE_HTTP_{resp.status_code}",
                        "hardware_acceleration": "FALLBACK_CPU_LOCAL",
                        "validation_status": "UNVALIDATED_DEMO_ALGORITHM",
                        "notice": "GPU endpoint returned non-200; fallback to local deterministic triage rules."
                    }
        except Exception as e:
            return {
                "gpu_service_configured": True,
                "service_url": self.endpoint_url,
                "status": f"CONNECTION_FAILED: {str(e)}",
                "hardware_acceleration": "FALLBACK_CPU_LOCAL",
                "validation_status": "UNVALIDATED_DEMO_ALGORITHM",
                "notice": "Cannot reach GPU endpoint; operating deterministically on CPU."
            }

    async def predict_triage(
        self,
        vitals: Dict[str, Any],
        trauma_mechanism: Optional[str] = None
    ) -> Dict[str, Any]:
        # Always run deterministic rule baseline
        deterministic_baseline = evaluate_patient_triage(
            heart_rate=vitals.get("heart_rate"),
            spo2=vitals.get("spo2"),
            systolic_bp=vitals.get("systolic_bp"),
            diastolic_bp=vitals.get("diastolic_bp"),
            respiratory_rate=vitals.get("respiratory_rate"),
            temperature=vitals.get("temperature"),
            gcs=vitals.get("gcs"),
            pain_level=vitals.get("pain_level"),
            tourniquet_applied=vitals.get("tourniquet_applied", False),
            tourniquet_elapsed_mins=vitals.get("tourniquet_elapsed_mins", 0)
        )

        # If no GPU inference service is configured, return deterministic output
        if not self.is_configured:
            return {
                "triage_priority": deterministic_baseline["priority"],
                "confidence_score": 1.0,
                "rationale": f"[Deterministic Rule Engine]: {deterministic_baseline['explanation']}",
                "rule_crosscheck": deterministic_baseline["rule_hits"],
                "model_source": "GRAYLINE-DETERMINISTIC-RULES-V2",
                "validation_status": "UNVALIDATED_DEMO_ALGORITHM",
                "requires_human_certification": True
            }

        # Otherwise attempt inference with fallback
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                headers = {"Content-Type": "application/json"}
                if self.api_key:
                    headers["Authorization"] = f"Bearer {self.api_key}"

                payload = {
                    "vitals": vitals,
                    "trauma_mechanism": trauma_mechanism
                }
                resp = await client.post(f"{self.endpoint_url}/predict", json=payload, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    return {
                        "triage_priority": data.get("priority", deterministic_baseline["priority"]),
                        "confidence_score": float(data.get("confidence", 0.85)),
                        "rationale": data.get("rationale", deterministic_baseline["explanation"]),
                        "rule_crosscheck": deterministic_baseline["rule_hits"],
                        "model_source": data.get("model", "REMOTE_GPU_SERVICE"),
                        "validation_status": "UNVALIDATED_PILOT_MODEL",
                        "requires_human_certification": True
                    }
        except Exception:
            pass

        # Fallback
        return {
            "triage_priority": deterministic_baseline["priority"],
            "confidence_score": 0.95,
            "rationale": f"[Fallback Engine]: {deterministic_baseline['explanation']}",
            "rule_crosscheck": deterministic_baseline["rule_hits"],
            "model_source": "GRAYLINE-DETERMINISTIC-FALLBACK",
            "validation_status": "UNVALIDATED_DEMO_ALGORITHM",
            "requires_human_certification": True
        }

inference_client = InferenceServiceClient()
