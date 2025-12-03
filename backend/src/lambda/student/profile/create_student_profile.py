import os
from datetime import datetime, timezone
from typing import Any, Dict

import boto3
from botocore.exceptions import ClientError

from student.shared.model.StudentModel import StudentModel
from utils import aws_utils
from utils.sns_utils import subscribe_user_to_notifications

dynamodb = aws_utils.get_dynamodb_resource()
table_name = os.environ.get('STUDENTS_TABLE_NAME', 'students')
students_table = dynamodb.Table(table_name)

# SNS topic ARN for attendance notifications
SNS_TOPIC_ARN = os.environ.get('SNS_TOPIC_ARN')

# Cognito client for group assignment
cognito_client = boto3.client('cognito-idp')


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    try:
        user_attributes = event.get('request', {}).get('userAttributes', {})
        trigger_source = event.get('triggerSource', '')
        user_pool_id = event.get('userPoolId')  # Extract from Cognito event

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

        # Subscribe user to SNS notification topic
        subscription_arn = None

        if SNS_TOPIC_ARN:
            try:
                subscription_arn = subscribe_user_to_notifications(
                    topic_arn=SNS_TOPIC_ARN,
                    user_email=email
                )
                print(f"Successfully subscribed {email} to SNS topic. ARN: {subscription_arn}")
            except Exception as e:
                print(f"Failed to subscribe to SNS topic: {str(e)}")
                # Continue with profile creation even if SNS subscription fails
        else:
            print("SNS topic ARN not configured, skipping subscription")

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
            sns_subscription_arn=subscription_arn,
            created_at=current_time,
            updated_at=current_time,
        )
        students_table.put_item(Item=student.to_dynamodb_item())
        print(f"Successfully created student record for user_id: {user_id}, email: {email}")

        # Assign user to Student group in Cognito
        if user_pool_id:
            try:
                cognito_client.admin_add_user_to_group(
                    UserPoolId=user_pool_id,
                    Username=user_id,
                    GroupName='Student'
                )
                print(f"Successfully added user {user_id} to Student group")
            except Exception as e:
                print(f"Failed to add user to Student group: {str(e)}")
                # Continue even if group assignment fails
        else:
            print("UserPoolId not found in event, skipping group assignment")

    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        print(f"DynamoDB ClientError: {error_code} - {error_message}")
        print(f"Failed to create student record, but allowing sign-up to proceed")

    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        print(f"Failed to create student record, but allowing sign-up to proceed")

    return event
