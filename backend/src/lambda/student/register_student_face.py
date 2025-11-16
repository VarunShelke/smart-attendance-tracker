import base64
import json
import os
from datetime import datetime
from typing import Dict, Any

from ..utils import aws_utils
from ..constants import constants

s3_client = aws_utils.get_client_for_resource('s3')
cognito_client = aws_utils.get_client_for_resource('cognito-idp')

# Environment variables
S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME')
USER_POOL_ID = os.environ.get('USER_POOL_ID')
API_VERSION = os.environ.get('API_VERSION', 'v1')


def create_response(status_code: int, body: Dict[str, Any], headers: Dict[str, str] = None) -> Dict[str, Any]:
    default_headers = constants.DEFAULT_HEADERS

    if headers:
        default_headers.update(headers)

    return {
        'statusCode': status_code,
        'headers': default_headers,
        'body': json.dumps(body)
    }


def validate_request(event):
    try:
        http_method = event.get('httpMethod', '').upper()
        if http_method == 'OPTIONS':
            return create_response(200, {
                'message': 'CORS preflight successful'
            })

        # Validate HTTP method
        if http_method != 'POST':
            return create_response(405, {
                'error': 'Method Not Allowed',
                'message': f'HTTP method {http_method} is not supported. Use POST.'
            })
        # Parse request body
        if not event.get('body'):
            return create_response(400, {
                'error': 'Bad Request',
                'message': 'Request body is required'
            })
    except Exception as e:
        return create_response(400, {
            'error': 'Bad Request',
            'message': f'Invalid base64 image data: {str(e)}'
        })


def handler(event, context):
    try:
        validate_request(event)

        body_str = event['body']
        if event.get('isBase64Encoded', False):
            body_str = base64.b64decode(body_str).decode('utf-8')

        try:
            body = json.loads(body_str)
        except json.JSONDecodeError:
            return create_response(400, {
                'error': 'Bad Request',
                'message': 'Invalid JSON in request body'
            })

        authorizer_claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_id = authorizer_claims.get('sub')
        email = authorizer_claims.get('email')

        if not user_id:
            return create_response(401, {
                'error': 'Unauthorized',
                'message': 'User not authenticated'
            })

        # Validate required fields
        face_image = body.get('faceImage')
        if not face_image:
            return create_response(400, {
                'error': 'Bad Request',
                'message': 'faceImage is required'
            })

        # Validate image size (13MB limit - leaving buffer for API Gateway 10MB limit)
        if len(face_image) > 13 * 1024 * 1024:
            return create_response(413, {
                'error': 'Payload Too Large',
                'message': 'Image size exceeds 13MB limit'
            })

        # Generate S3 key
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        s3_key = f"face_registrations/{user_id}/{timestamp}.jpg"

        # Decode base64 image
        try:
            image_data = base64.b64decode(face_image)
        except Exception as e:
            return create_response(400, {
                'error': 'Bad Request',
                'message': f'Invalid base64 image data: {str(e)}'
            })

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

        # Return success response
        return create_response(200, {
            'message': 'Face registered successfully',
            'data': {
                'userId': user_id,
                'email': email,
                's3Key': s3_key,
                'timestamp': timestamp,
                'bucketName': S3_BUCKET_NAME,
            }
        })

    except s3_client.exceptions.NoSuchBucket:
        return create_response(500, {
            'error': 'Internal Server Error',
            'message': 'Storage bucket not found'
        })

    except Exception as e:
        print(f"Error processing face registration: {str(e)}")
        return create_response(500, {
            'error': 'Internal Server Error',
            'message': 'An error occurred while processing your request'
        })
