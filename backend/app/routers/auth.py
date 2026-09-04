from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel

from app.services.auth import authenticate_user, create_access_token, decode_token

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


class TokenOut(BaseModel):
    access_token: str
    token_type: str


def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    username = decode_token(token)
    if not username:
        raise HTTPException(status_code=401, detail="Ogiltig token")
    return username


@router.post("/login", response_model=TokenOut)
async def login(form: OAuth2PasswordRequestForm = Depends()):
    if not authenticate_user(form.username, form.password):
        raise HTTPException(status_code=401, detail="Felaktigt användarnamn eller lösenord")
    token = create_access_token(form.username)
    return TokenOut(access_token=token, token_type="bearer")


@router.get("/me")
async def me(username: str = Depends(get_current_user)):
    return {"username": username}
