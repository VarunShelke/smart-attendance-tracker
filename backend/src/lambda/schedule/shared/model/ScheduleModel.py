import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, field_validator


class ScheduleModel(BaseModel):
    schedule_id: str
    university_code: str
    course_id: str
    course_name: str
    instructor: Optional[str] = None
    instructor_id: Optional[str] = None  # user_id of the instructor who owns this schedule
    days_of_week: List[str]
    start_time: str
    end_time: str
    location: str
    semester: str
    created_at: datetime
    updated_at: datetime

    @field_validator('schedule_id')
    @classmethod
    def validate_schedule_id(cls, v: str) -> str:
        """Validate schedule_id format (UNIVERSITY_COURSEID)."""
        if not re.match(r'^[A-Z0-9]{2,10}_[A-Z0-9]{2,20}$', v):
            raise ValueError('Schedule ID must be in format UNIVERSITYCODE_COURSEID (e.g., PITT_CS2060)')
        return v

    @field_validator('university_code')
    @classmethod
    def validate_university_code(cls, v: str) -> str:
        """Validate university code format (uppercase alphanumeric, 2-10 chars)."""
        if not re.match(r'^[A-Z0-9]{2,10}$', v):
            raise ValueError('University code must be 2-10 uppercase alphanumeric characters')
        return v

    @field_validator('course_id')
    @classmethod
    def validate_course_id(cls, v: str) -> str:
        """Validate course_id format (uppercase alphanumeric, 2-20 chars)."""
        if not re.match(r'^[A-Z0-9]{2,20}$', v):
            raise ValueError('Course ID must be 2-20 uppercase alphanumeric characters')
        return v

    @field_validator('days_of_week')
    @classmethod
    def validate_days_of_week(cls, v: List[str]) -> List[str]:
        """Validate days_of_week contains valid day abbreviations."""
        valid_days = {'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'}
        if not v or len(v) == 0:
            raise ValueError('At least one day of the week must be specified')

        for day in v:
            if day.upper() not in valid_days:
                raise ValueError(f'Invalid day: {day}. Must be one of {valid_days}')

        # Return uppercase days
        return [day.upper() for day in v]

    @field_validator('start_time', 'end_time')
    @classmethod
    def validate_time(cls, v: str) -> str:
        """Validate time format (HH:MM in 24-hour format)."""
        if not re.match(r'^([01]\d|2[0-3]):([0-5]\d)$', v):
            raise ValueError('Time must be in HH:MM format (24-hour, e.g., 10:00, 14:30)')
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
    def from_dict(cls, data: Dict[str, Any]) -> 'ScheduleModel':
        """Create model from dictionary, parsing ISO date strings."""
        if 'created_at' in data and isinstance(data['created_at'], str):
            data['created_at'] = datetime.fromisoformat(data['created_at'])
        if 'updated_at' in data and isinstance(data['updated_at'], str):
            data['updated_at'] = datetime.fromisoformat(data['updated_at'])

        return cls(**data)

    def to_dynamodb_item(self) -> Dict[str, Any]:
        """Convert model to DynamoDB item format."""
        item = {
            'schedule_id': self.schedule_id,
            'university_code': self.university_code,
            'course_id': self.course_id,
            'course_name': self.course_name,
            'instructor': self.instructor,
            'instructor_id': self.instructor_id,
            'days_of_week': self.days_of_week,
            'start_time': self.start_time,
            'end_time': self.end_time,
            'location': self.location,
            'semester': self.semester,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }
        return item

    @classmethod
    def from_dynamodb_item(cls, item: Dict[str, Any]) -> 'ScheduleModel':
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
