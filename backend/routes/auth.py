import requests
from nanoid import generate
from datetime import datetime
from fastapi import APIRouter
from pydantic import BaseModel
from auth import create_access_token
import os

router = APIRouter()

# 1. AUTH & SERVER CONFIG
# Use the root URL here to avoid double-pathing bugs
COUCH_SERVER = os.getenv("COUCH_SERVER")
DB_NAME = os.getenv("DB_NAME")
ADMIN_AUTH = (os.getenv("COUCH_USER"), os.getenv("COUCH_PASS"))

# -------------------------
# HELPERS
# -------------------------
def generate_id(prefix: str):
    """Generates a collision-resistant NanoID with a type prefix."""
    return f"{prefix}_{generate(size=12)}"

def put_doc(doc):
    """Puts a document into the central teamstar database using Admin rights."""
    url = f"{COUCH_SERVER}/{DB_NAME}/{doc['_id']}"
    res = requests.put(url, json=doc, auth=ADMIN_AUTH)
    return res

# -------------------------
# MODELS
# -------------------------
class LoginRequest(BaseModel):
    username: str # This is the phone number
    password: str # This is the pin

class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    username: str # phone
    password: str # pin
    role: str | None = "member"
    orgName: str | None = None
    orgDesc: str | None = None

# -------------------------
# ROUTES
# -------------------------

@router.post("/login")
def login(data: LoginRequest):
    # 1. Search for a document that matches Type, Phone, and Pin
    search_query = {
        "selector": {
            "type": "user",
            "phone": data.username,
            "pin": data.password
        },
        "limit": 1
    }

    # URL construction: http://couchdb:5984/teamstar/_find
    res = requests.post(
        f"{COUCH_SERVER}/{DB_NAME}/_find",
        json=search_query,
        auth=ADMIN_AUTH
    )

    if res.status_code != 200:
        return {"success": False, "error": "Database connection error"}

    docs = res.json().get("docs", [])

    if not docs:
        return {"success": False, "error": "Invalid phone number or PIN"}

    # 2. Return the matching user data and token
    user_doc = docs[0]
    token = create_access_token({"sub": user_doc["phone"]})

    return {
        "success": True,
        "token": token,
        "db": DB_NAME,
        "user_session": {
            "id": user_doc["_id"],
            "name": f"{user_doc['first_name']} {user_doc['last_name']}",
            "access_rights": user_doc.get("access_rights")
        }
    }

@router.post("/register")
def register(data: RegisterRequest):
    # 1. check if phone already exists
    check_query = {
        "selector": {"type": "user", "phone": data.username},
        "limit": 1
    }
    check_res = requests.post(f"{COUCH_SERVER}/{DB_NAME}/_find", json=check_query, auth=ADMIN_AUTH)
    
    if check_res.json().get("docs"):
        return {"success": False, "error": "Phone number already registered"}

    # 2. Setup IDs
    user_id = generate_id("user")
    org_id = generate_id("org") if data.role == "owner" else None
    notif_id = generate_id("notif")

    # 3. Create User Document
    user_profile = {
        "_id": user_id,
        "type": "user",
        "first_name": data.first_name,
        "last_name": data.last_name,
        "phone": data.username,
        "pin": data.password,
        "access_rights": [{"org_id": org_id, "role": data.role, "team_ids": []}],
        "created_at": datetime.utcnow().isoformat()
    }
    put_doc(user_profile)

    # 4. Create Organization Document (if Owner)
    if data.role == "owner" and data.orgName:
        org_doc = {
            "_id": org_id,
            "type": "organization",
            "name": data.orgName,
            "description": data.orgDesc,
            "owner_id": user_id,
            "created_at": datetime.utcnow().isoformat()
        }
        put_doc(org_doc)

    # 5. Create Welcome Notification
    notification = {
        "_id": notif_id,
        "type": "notification",
        "org_id": org_id,
        "user_id": user_id,
        "title": "Welcome to Teamstar",
        "message": f"Hello {data.first_name}! Your workspace is ready to go.",
        "status": "unread",
        "created_at": datetime.utcnow().isoformat()
    }
    put_doc(notification)

    # 6. Return response
    token = create_access_token({"sub": data.username})
    return {
        "success": True,
        "token": token,
        "username": data.username,
        "db": DB_NAME
    }