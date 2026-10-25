from fastapi import APIRouter, Depends
from backend.schemas import GPUStatusResponse, InferenceRequest, InferenceResponse
from backend.models import User
from backend.auth import get_current_user
from backend.inference_service import inference_client

router = APIRouter(prefix="/inference", tags=["GPU Inference & Model Gateway"])

@router.get("/status", response_model=GPUStatusResponse)
async def get_gpu_inference_status(current_user: User = Depends(get_current_user)):
    """Returns GPU endpoint configuration status without false claims."""
    status_info = await inference_client.check_gpu_status()
    return GPUStatusResponse(**status_info)

@router.post("/predict", response_model=InferenceResponse)
async def predict_triage_inference(
    req: InferenceRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Submits vitals to optional external GPU inference service if configured.
    Falls back gracefully to local deterministic rules and requires human review.
    """
    vitals_dict = req.vitals.model_dump()
    result = await inference_client.predict_triage(
        vitals=vitals_dict,
        trauma_mechanism=req.trauma_mechanism
    )
    return InferenceResponse(**result)
