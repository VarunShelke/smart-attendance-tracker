import os
from datetime import datetime, timezone
from typing import Any, Dict

from botocore.exceptions import ClientError

from student.shared.model.StudentModel import StudentModel
from utils import aws_utils

dynamodb = aws_utils.get_dynamodb_resource()
table_name = os.environ.get('STUDENTS_TABLE_NAME', 'students')
students_table = dynamodb.Table(table_name)


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    try:
        user_attributes = event.get('request', {}).get('userAttributes', {})
        trigger_source = event.get('triggerSource', '')

        if trigger_source != 'PostConfirmation_ConfirmSignUp':
            print(f"Skipping non-signup trigger: {trigger_source}")
            return event

        user_id = user_attributes.get('sub')
        email = user_attributes.get('email')
        given_name = user_attributes.get('given_name', '')
        family_name = user_attributes.get('family_name', '')

        if not user_id or not email:
            raise ValueError(f"Missing required attributes: user_id={user_id}, email={email}")

        current_time = datetime.now(timezone.utc)

        student = StudentModel(
            user_id=user_id,
            student_id=None,
            first_name=given_name,
            last_name=family_name,
            email=email,
            phone_number=None,
            face_registered=False,
            face_s3_key=None,
            face_registered_at=None,
            created_at=current_time,
            updated_at=current_time,
        )
        students_table.put_item(Item=student.to_dynamodb_item())
        print(f"Successfully created student record for user_id: {user_id}, email: {email}")

    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        print(f"DynamoDB ClientError: {error_code} - {error_message}")
        print(f"Failed to create student record, but allowing sign-up to proceed")

    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        print(f"Failed to create student record, but allowing sign-up to proceed")

    return event
