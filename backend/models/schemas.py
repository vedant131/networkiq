from pydantic import BaseModel
from typing import Optional

class QueryRequest(BaseModel):
    session_id: str
    query: str

class MessageRequest(BaseModel):
    session_id: str
    connection_id: str
    message_type: Optional[str] = "networking"

class ExportRequest(BaseModel):
    session_id: str
    format: Optional[str] = "xlsx"

class MatchRequest(BaseModel):
    session_id: str
    profile_text: str
