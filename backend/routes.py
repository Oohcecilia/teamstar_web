from fastapi import FastAPI
from pydantic import BaseModel
import requests
from datetime import datetime

from auth import create_access_token

app = FastAPI()

COUCH_URL = "http://couchdb:5984"
ADMIN_USER = "admin"
ADMIN_PASS = "x1root99"


# -------------------------
# REQUEST MODEL
# -------------------------
class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    username: str
    password: str
    role: str | None = "member"
    orgName: str | None = None
    orgDesc: str | None = None


# -------------------------
# HELPERS
# -------------------------
def couch_put(db, doc):
    return requests.put(
        f"{COUCH_URL}/{db}/{doc['_id']}",
        json=doc,
        auth=(ADMIN_USER, ADMIN_PASS),
    )


# -------------------------
# REGISTER ENDPOINT
# -------------------------
@app.post("/register")
def register(data: RegisterRequest):

    organization_id = None

    # -------------------------
    # 1. CREATE ORGANIZATION (IF OWNER)
    # -------------------------
    if data.role == "owner":
        org = {
            "_id": f"org_{data.username}",
            "name": data.orgName,
            "description": data.orgDesc,
            "created_at": datetime.utcnow().isoformat()
        }

        res = couch_put("organizations", org)

        if res.status_code not in [201, 202]:
            return {"success": False, "error": "Failed to create organization"}

        organization_id = org["_id"]

    # -------------------------
    # 2. CREATE USER
    # -------------------------
    user = {
        "_id": f"user_{data.username}",
        "first_name": data.first_name,
        "last_name": data.last_name,
        "full_name": f"{data.first_name} {data.last_name}",
        "phone": data.username,
        "pin": data.password,
        "access_rights": [
            {
                "org_id": organization_id,
                "role": data.role or "member",
                "team_ids": []
            }
        ] if organization_id else [],
        "email": f"{data.username}@app.local",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": ""
    }

    res = couch_put("users", user)

    if res.status_code not in [201, 202]:
        return {"success": False, "error": "Failed to create user"}

    # -------------------------
    # 3. CREATE NOTIFICATION
    # -------------------------
    notification = {
        "_id": f"notif_{data.username}_{int(datetime.utcnow().timestamp())}",
        "type": "info",
        "title": "Welcome to your workspace",
        "message": f"Welcome {data.first_name} {data.last_name}! Your workspace has been created successfully.",
        "user_id": user["_id"],
        "created_by": "System",
        "created_at": datetime.utcnow().isoformat()
    }

    couch_put("notifications", notification)

    # -------------------------
    # 4. JWT TOKEN
    # -------------------------
    token = create_access_token({
        "sub": data.username
    })

    return {
        "success": True,
        "token": token,
        "username": data.username,
        "roles": [data.role or "member"],
        "db": f"app-db-{data.username}"
    }