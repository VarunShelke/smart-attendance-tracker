"""
Register Student Face Lambda Handler

Allows students to register their face for attendance verification.
"""

import base64
import logging
import os
from datetime import datetime, timezone

from utils import aws_utils
from utils.api_response import APIResponse
from utils.request_utils import parse_json_body, validate_http_method

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3_client = aws_utils.get_client_for_resource('s3')
cognito_client = aws_utils.get_client_for_resource('cognito-idp')
dynamodb_client = aws_utils.get_client_for_resource('dynamodb')

# Environment variables
S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME')
USER_POOL_ID = os.environ.get('USER_POOL_ID')
STUDENTS_TABLE_NAME = os.environ.get('STUDENTS_TABLE_NAME')
API_VERSION = os.environ.get('API_VERSION', 'v1')


def handler(event, context):
    try:
        # Validate HTTP method
        error = validate_http_method(event, ['POST'])
        if error:
            return error

        # Parse request body
        body, error = parse_json_body(event)
        if error:
            return error

        authorizer_claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_id = authorizer_claims.get('sub')
        email = authorizer_claims.get('email')

        if not user_id:
            return APIResponse.unauthorized('User not authenticated')

        # Validate required fields
        face_image = body.get('faceImage')
        if not face_image:
            return APIResponse.bad_request('faceImage is required')

        # Validate image size (13MB limit - leaving buffer for API Gateway 10MB limit)
        if len(face_image) > 13 * 1024 * 1024:
            return APIResponse.payload_too_large('Image size exceeds 13MB limit', max_size='13MB')

        # Generate S3 key
        timestamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
        s3_key = f"face_registrations/{user_id}/{timestamp}.jpg"

        try:
            if face_image.startswith('data:image'):
                logger.warning("Received data URL format, stripping prefix")
                face_image = face_image.split(',', 1)[1]

            image_data = base64.b64decode(face_image)
        except Exception as e:
            return APIResponse.bad_request(f'Invalid base64 image data: {str(e)}')

        # Upload to S3
        s3_client.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=s3_key,
            Body=image_data,
            ContentType='image/jpeg',
            Metadata={
                'user_id': user_id,
                'email': email or 'unknown',
                'uploaded_at': timestamp,
            }
        )

        # Update DynamoDB students table with face registration info
        current_time = datetime.now(timezone.utc).isoformat()
        try:
            dynamodb_client.update_item(
                TableName=STUDENTS_TABLE_NAME,
                Key={'user_id': {'S': user_id}},
                UpdateExpression='SET face_registered = :fr, face_s3_key = :s3k, face_registered_at = :fra, updated_at = :ua',
                ExpressionAttributeValues={
                    ':fr': {'BOOL': True},
                    ':s3k': {'S': s3_key},
                    ':fra': {'S': current_time},
                    ':ua': {'S': current_time},
                },
                ReturnValues='NONE'
            )
        except Exception as db_error:
            # Log the error but don't fail the request since S3 upload succeeded
            logger.warning(f"Failed to update DynamoDB: {str(db_error)}")
            logger.info(f"Face image was uploaded to S3 successfully at {s3_key}")

        # Return success response
        return APIResponse.ok({
            'userId': user_id,
            'email': email,
            's3Key': s3_key,
            'timestamp': timestamp,
            'bucketName': S3_BUCKET_NAME,
        }, message='Face registered successfully')

    except s3_client.exceptions.NoSuchBucket:
        return APIResponse.internal_error('Storage bucket not found')

    except Exception as e:
        logger.error(f"Error processing face registration: {str(e)}", exc_info=True)
        return APIResponse.internal_error('An error occurred while processing your request')
