"""Public app settings endpoint — polled by AuthContext."""
from fastapi import APIRouter

router = APIRouter(prefix="/api/apps", tags=["apps"])


@router.get("/public/prod/public-settings/by-id/{app_id}")
def get_public_settings(app_id: str):
    """
    AuthContext polls this to determine if auth is required.
    We return auth_required: false so the app loads without a login wall.
    """
    return {
        "id": app_id,
        "public_settings": {
            "auth_required": False,
            "allow_guest": True,
            "app_name": "CogniFlow",
        },
    }
