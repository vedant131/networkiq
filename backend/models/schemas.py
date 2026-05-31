from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any

class QueryRequest(BaseModel):
    session_id: str
    query: str = Field(..., max_length=500)
    filters: Optional[Dict[str, Any]] = None

    @validator('query')
    def sanitize_query(cls, v):
        dangerous = ["ignore previous", "system:", "assistant:", "]]"]
        for d in dangerous:
            if d.lower() in v.lower():
                raise ValueError("Invalid input")
        return v

class MessageRequest(BaseModel):
    session_id: str
    connection_id: int
    purpose: Optional[str] = Field("networking", max_length=100)

class ExportRequest(BaseModel):
    session_id: str
    format: Optional[str] = "xlsx"

class MatchRequest(BaseModel):
    session_id: str
    profile_text: str = Field(..., max_length=2000)

    @validator('profile_text')
    def sanitize_prompt(cls, v):
        dangerous = ["ignore previous", "system:", "assistant:", "]]"]
        for d in dangerous:
            if d.lower() in v.lower():
                raise ValueError("Invalid input")
        return v
