import re
from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, EmailStr, field_validator


class StudentModel(BaseModel):
    user_id: str
    student_id: Optional[str] = None
    first_name: str
    last_name: str
    email: EmailStr
    phone_number: Optional[str] = None
    face_registered: bool = False
    face_s3_key: Optional[str] = None
    face_registered_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    @field_validator('phone_number')
    @classmethod
    def validate_phone_number(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v

        # Remove common separators and spaces
        cleaned = re.sub(r'[\s\-\(\)\.]', '', v)

        # Check if it's a valid format (10-15 digits, optionally starting with +)
        if not re.match(r'^\+?\d{10,15}$', cleaned):
            raise ValueError('Phone number must contain 10-15 digits and may start with +')

        return v

    def to_dict(self) -> Dict[str, Any]:
        data = self.model_dump()

        if self.created_at:
            data['created_at'] = self.created_at.isoformat()
        if self.updated_at:
            data['updated_at'] = self.updated_at.isoformat()
        if self.face_registered_at:
            data['face_registered_at'] = self.face_registered_at.isoformat()

        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'StudentModel':
        if 'created_at' in data and isinstance(data['created_at'], str):
            data['created_at'] = datetime.fromisoformat(data['created_at'])
        if 'updated_at' in data and isinstance(data['updated_at'], str):
            data['updated_at'] = datetime.fromisoformat(data['updated_at'])
        if 'face_registered_at' in data and isinstance(data['face_registered_at'], str):
            data['face_registered_at'] = datetime.fromisoformat(data['face_registered_at'])

        return cls(**data)

    def to_dynamodb_item(self) -> Dict[str, Any]:
        item = {
            'user_id': self.user_id,
            'student_id': self.student_id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'email': self.email,
            'phone_number': self.phone_number,
            'face_registered': self.face_registered,
            'face_s3_key': self.face_s3_key,
            'face_registered_at': self.face_registered_at.isoformat() if self.face_registered_at else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }
        return item

    @classmethod
    def from_dynamodb_item(cls, item: Dict[str, Any]) -> 'StudentModel':
        data = {**item}

        if 'created_at' in data and isinstance(data['created_at'], str):
            data['created_at'] = datetime.fromisoformat(data['created_at'])
        if 'updated_at' in data and isinstance(data['updated_at'], str):
            data['updated_at'] = datetime.fromisoformat(data['updated_at'])
        if 'face_registered_at' in data and data['face_registered_at'] and isinstance(data['face_registered_at'], str):
            data['face_registered_at'] = datetime.fromisoformat(data['face_registered_at'])

        return cls(**data)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }
        # Allow arbitrary types for datetime
        arbitrary_types_allowed = True
