import re
from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, field_validator


class UniversityModel(BaseModel):
    university_id: str
    university_code: str
    university_name: str
    domain: str
    status: str = "active"
    address: Optional[str] = None
    timezone: str = "America/New_York"
    created_at: datetime
    updated_at: datetime

    @field_validator('university_code')
    @classmethod
    def validate_university_code(cls, v: str) -> str:
        """Validate university code format (uppercase alphanumeric, 2-10 chars)."""
        if not re.match(r'^[A-Z0-9]{2,10}$', v):
            raise ValueError('University code must be 2-10 uppercase alphanumeric characters')
        return v

    @field_validator('domain')
    @classmethod
    def validate_domain(cls, v: str) -> str:
        """Validate domain format (basic domain validation)."""
        if not re.match(r'^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$', v.lower()):
            raise ValueError('Invalid domain format')
        return v.lower()

    @field_validator('status')
    @classmethod
    def validate_status(cls, v: str) -> str:
        """Validate status is either active or inactive."""
        if v not in ['active', 'inactive']:
            raise ValueError('Status must be either "active" or "inactive"')
        return v

    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary with ISO formatted dates."""
        data = self.model_dump()

        if self.created_at:
            data['created_at'] = self.created_at.isoformat()
        if self.updated_at:
            data['updated_at'] = self.updated_at.isoformat()

        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'UniversityModel':
        """Create model from dictionary, parsing ISO date strings."""
        if 'created_at' in data and isinstance(data['created_at'], str):
            data['created_at'] = datetime.fromisoformat(data['created_at'])
        if 'updated_at' in data and isinstance(data['updated_at'], str):
            data['updated_at'] = datetime.fromisoformat(data['updated_at'])

        return cls(**data)

    def to_dynamodb_item(self) -> Dict[str, Any]:
        """Convert model to DynamoDB item format."""
        item = {
            'university_id': self.university_id,
            'university_code': self.university_code,
            'university_name': self.university_name,
            'domain': self.domain,
            'status': self.status,
            'address': self.address,
            'timezone': self.timezone,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }
        return item

    @classmethod
    def from_dynamodb_item(cls, item: Dict[str, Any]) -> 'UniversityModel':
        """Create model from DynamoDB item, parsing date strings."""
        data = {**item}

        if 'created_at' in data and isinstance(data['created_at'], str):
            data['created_at'] = datetime.fromisoformat(data['created_at'])
        if 'updated_at' in data and isinstance(data['updated_at'], str):
            data['updated_at'] = datetime.fromisoformat(data['updated_at'])

        return cls(**data)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }
        arbitrary_types_allowed = True
