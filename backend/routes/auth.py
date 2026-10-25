import logging
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from backend.config import settings
from backend.database import get_db
from backend.models import User
from backend.schemas import Token, UserLogin, UserResponse
from backend.auth import verify_password, create_access_token, get_current_user

logger = logging.getLogger("grayline.auth")
router = APIRouter(prefix="/auth", tags=["Authentication & Security"])

@router.post("/login", response_model=Token)
def login_for_access_token(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == login_data.username).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        logger.warning(f"Failed login attempt for username: {login_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    logger.info(f"Successful authentication: user={user.username}, role={user.role}")
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role, "id": user.id},
        expires_delta=access_token_expires
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        role=user.role,
        username=user.username
    )

@router.post("/token", response_model=Token, include_in_schema=False)
def login_oauth2_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    return login_for_access_token(
        UserLogin(username=form_data.username, password=form_data.password),
        db=db
    )

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
