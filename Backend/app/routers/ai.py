from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.ai import (
    ChatRequest,
    ChatResponse,
    GenerateDescriptionRequest,
    GenerateDescriptionResponse
)
from app.services.ai import AIService
from app.security.rate_limit import limiter
from app.auth.oauth2 import get_current_admin_user
import logging

# Set up logging for error tracking
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/ai",
    tags=["AI"]
)

@router.post("/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
@limiter.limit("15/minute")
async def chat_with_assistant(
    payload: ChatRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Exposes chatbot AI response service.
    Accepts user message and returns structured JSON containing reply text and suggested prompts.
    """
    try:
        response_data = await AIService.generate_chat_response(payload.message, db)
        return response_data
    except ValueError as val_err:
        logger.warning(f"Validation error in chat assistant: {str(val_err)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except Exception as exc:
        logger.error(f"Unexpected error in AI Chat Assistant: {str(exc)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while generating a response. Please try again later."
        )

@router.post("/chat/stream")
@limiter.limit("15/minute")
async def chat_with_assistant_stream(
    payload: ChatRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Streams chatbot AI response word-by-word (SSE format).
    """
    try:
        generator = AIService.generate_chat_response_stream(payload.message, db)
        return StreamingResponse(generator, media_type="text/event-stream")
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except Exception as exc:
        logger.error(f"Unexpected error in AI Chat Streaming: {str(exc)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while streaming response. Please try again later."
        )

@router.post("/generate-description", response_model=GenerateDescriptionResponse, status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def generate_product_description(
    payload: GenerateDescriptionRequest,
    request: Request,
    current_admin = Depends(get_current_admin_user)
):
    """
    Auto-generates a product description using AI. Requires Admin privileges.
    """
    try:
        description = await AIService.generate_product_description(
            payload.name,
            payload.category,
            payload.price
        )
        return {"description": description}
    except Exception as exc:
        logger.error(f"Failed to generate description: {str(exc)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate product description."
        )
