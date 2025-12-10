"""
Upsert University Lambda Handler

Admin-only endpoint to create or update university information.
"""

import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict

import boto3
from botocore.exceptions import ClientError
from pydantic import ValidationError

from university.shared.model.UniversityModel import UniversityModel
from utils.api_response import APIResponse
from utils.auth_utils import require_role, UserRole, AuthorizationError, create_forbidden_response
from utils.request_utils import parse_json_body, extract_path_parameter

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Environment variables
UNIVERSITIES_TABLE_NAME = os.environ.get('UNIVERSITIES_TABLE_NAME')

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
universities_table = dynamodb.Table(UNIVERSITIES_TABLE_NAME)


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler to create or update university information.

    Args:
        event: API Gateway event containing path parameters, request body, and context
        context: Lambda context object

    Returns:
        API Gateway response with university data (201 for create, 200 for update)
    """
    try:
        # Check authorization - only Admin can upsert universities
        try:
            user_context = require_role(event, [UserRole.ADMIN])
            logger.info(f"User {user_context['user_id']} authorized as Admin")
        except AuthorizationError as e:
            logger.warning(f"Authorization failed: {str(e)}")
            return create_forbidden_response()

        # Extract university_code from path parameters
        university_code, error = extract_path_parameter(event, 'university_code')
        if error:
            return error
        university_code = university_code.upper()
        logger.info(f"Processing upsert for university code: {university_code}")

        # Parse request body
        body, error = parse_json_body(event)
        if error:
            return error

        # Validate required fields in body
        from utils.request_utils import validate_required_fields
        error = validate_required_fields(body, ['university_name', 'domain'])
        if error:
            return error

        # Check if university_code in body matches path parameter (if provided)
        if 'university_code' in body and body['university_code'].upper() != university_code:
            logger.warning(f"Mismatched university_code in path and body")
            return APIResponse.bad_request('University code in path must match university_code in body')

        # Query to check if university already exists
        query_response = universities_table.query(
            IndexName='university-code-index',
            KeyConditionExpression='university_code = :code',
            ExpressionAttributeValues={
                ':code': university_code
            }
        )

        is_update = len(query_response.get('Items', [])) > 0
        existing_university_id = query_response['Items'][0]['university_id'] if is_update else None

        current_time = datetime.now(timezone.utc)

        # Prepare university data
        university_data = {
            'university_id': existing_university_id or str(uuid.uuid4()),
            'university_code': university_code,
            'university_name': body['university_name'],
            'domain': body['domain'],
            'status': body.get('status', 'active'),
            'address': body.get('address'),
            'timezone': body.get('timezone', 'America/New_York'),
            'created_at': query_response['Items'][0]['created_at'] if is_update else current_time,
            'updated_at': current_time,
        }

        # Validate using Pydantic model
        try:
            university_model = UniversityModel.from_dict(university_data)
        except ValidationError as ve:
            logger.warning(f"Validation error: {str(ve)}")
            return APIResponse.unprocessable_entity('Validation error', errors=ve.errors())

        # Save to DynamoDB
        universities_table.put_item(Item=university_model.to_dynamodb_item())

        logger.info(f"Successfully {'updated' if is_update else 'created'} university: {university_code}")

        if is_update:
            return APIResponse.ok(university_model.to_dict())
        else:
            return APIResponse.created(university_model.to_dict())

    except ClientError as e:
        logger.error(f"DynamoDB error: {str(e)}")
        return APIResponse.internal_error('Failed to upsert university')

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        return APIResponse.internal_error('An unexpected error occurred')
