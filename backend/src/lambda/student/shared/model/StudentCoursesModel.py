from datetime import datetime
from typing import Any, Dict

from pydantic import BaseModel


class StudentCourseModel(BaseModel):
    user_id: str
    course_id: str
    course_name: str
    schedule_id: str
    enrollment_date: datetime
    status: str = 'active'

    def to_dict(self) -> Dict[str, Any]:
        data = self.model_dump()

        if self.enrollment_date:
            data['enrollment_date'] = self.enrollment_date.isoformat()

        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'StudentCourseModel':
        if 'enrollment_date' in data and isinstance(data['enrollment_date'], str):
            data['enrollment_date'] = datetime.fromisoformat(data['enrollment_date'])

        return cls(**data)

    def to_dynamodb_item(self) -> Dict[str, Any]:
        item = {
            'user_id': self.user_id,
            'course_id': self.course_id,
            'course_name': self.course_name,
            'schedule_id': self.schedule_id,
            'enrollment_date': self.enrollment_date.isoformat(),
            'status': self.status,
        }
        return item

    @classmethod
    def from_dynamodb_item(cls, item: Dict[str, Any]) -> 'StudentCourseModel':
        data = {**item}

        if 'enrollment_date' in data and isinstance(data['enrollment_date'], str):
            data['enrollment_date'] = datetime.fromisoformat(data['enrollment_date'])

        return cls(**data)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }
        # Allow arbitrary types for datetime
        arbitrary_types_allowed = True
