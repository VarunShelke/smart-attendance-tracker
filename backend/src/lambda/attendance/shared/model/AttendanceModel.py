import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field, field_validator


class AttendanceStatus(str, Enum):
    PROCESSING = "processing"
    VERIFIED = "verified"
    FAILED = "failed"


class AttendanceModel(BaseModel):
    attendance_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    attendance_date: datetime
    status: AttendanceStatus = AttendanceStatus.PROCESSING
    similarity_score: Optional[float] = None
    face_s3_key: str
    tracking_id: str
    course_id: Optional[str] = None
    schedule_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    verified_at: Optional[datetime] = None
    error_message: Optional[str] = None

    @field_validator('similarity_score')
    @classmethod
    def validate_similarity_score(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and (v < 0 or v > 100):
            raise ValueError('Similarity score must be between 0 and 100')
        return v

    def to_dict(self) -> Dict[str, Any]:
        data = self.model_dump()

        # Convert enums to their values
        if self.status:
            data['status'] = self.status.value

        # Convert datetime objects to ISO format strings
        if self.attendance_date:
            data['attendance_date'] = self.attendance_date.isoformat()
        if self.created_at:
            data['created_at'] = self.created_at.isoformat()
        if self.verified_at:
            data['verified_at'] = self.verified_at.isoformat()

        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AttendanceModel':
        # Convert ISO format strings to datetime objects
        if 'attendance_date' in data and isinstance(data['attendance_date'], str):
            data['attendance_date'] = datetime.fromisoformat(data['attendance_date'])
        if 'created_at' in data and isinstance(data['created_at'], str):
            data['created_at'] = datetime.fromisoformat(data['created_at'])
        if 'verified_at' in data and isinstance(data['verified_at'], str):
            data['verified_at'] = datetime.fromisoformat(data['verified_at'])

        return cls(**data)

    def to_dynamodb_item(self) -> Dict[str, Any]:
        item = {
            'attendance_id': self.attendance_id,
            'user_id': self.user_id,
            'attendance_date': self.attendance_date.isoformat(),
            'status': self.status.value,
            'similarity_score': self.similarity_score,
            'face_s3_key': self.face_s3_key,
            'tracking_id': self.tracking_id,
            'course_id': self.course_id,
            'schedule_id': self.schedule_id,
            'created_at': self.created_at.isoformat(),
            'verified_at': self.verified_at.isoformat() if self.verified_at else None,
            'error_message': self.error_message,
        }
        return item

    @classmethod
    def from_dynamodb_item(cls, item: Dict[str, Any]) -> 'AttendanceModel':
        data = {**item}

        # Convert ISO format strings to datetime objects
        if 'attendance_date' in data and isinstance(data['attendance_date'], str):
            data['attendance_date'] = datetime.fromisoformat(data['attendance_date'])
        if 'created_at' in data and isinstance(data['created_at'], str):
            data['created_at'] = datetime.fromisoformat(data['created_at'])
        if 'verified_at' in data and data['verified_at'] and isinstance(data['verified_at'], str):
            data['verified_at'] = datetime.fromisoformat(data['verified_at'])

        # Convert Decimal to float for similarity_score (DynamoDB returns Decimal)
        if 'similarity_score' in data and isinstance(data['similarity_score'], Decimal):
            data['similarity_score'] = float(data['similarity_score'])

        return cls(**data)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }
        # Allow arbitrary types for datetime
        arbitrary_types_allowed = True
