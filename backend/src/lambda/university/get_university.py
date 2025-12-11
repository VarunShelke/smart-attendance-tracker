"""
Get University Lambda Handler

Retrieves university information by university code.
"""

import logging
import os
from typing import Any, Dict

import boto3
from botocore.exceptions import ClientError

from university.shared.model.UniversityModel import UniversityModel
from utils.api_response import APIResponse
from utils.request_utils import extract_path_parameter

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
    Lambda handler to get university information by university code.

    Args:
        event: API Gateway event containing path parameters and request context
        context: Lambda context object

    Returns:
        API Gateway response with university data
    """
    try:
        # Extract university_code from path parameters
        university_code, error = extract_path_parameter(event, 'university_code')
        if error:
            return error
        logger.info(f"Fetching university with code: {university_code}")

        # Query DynamoDB using GSI (university-code-index)
        response = universities_table.query(
            IndexName='university-code-index',
            KeyConditionExpression='university_code = :code',
            ExpressionAttributeValues={
                ':code': university_code.upper()
            }
        )

        # Check if a university exists
        if not response.get('Items') or len(response['Items']) == 0:
            logger.warning(f"University not found for code: {university_code}")
            return APIResponse.not_found(f'University with code {university_code} not found',
                                         resource_type='University')

        # Parse DynamoDB item to UniversityModel
        university_item = response['Items'][0]
        university = UniversityModel.from_dynamodb_item(university_item)

        logger.info(f"Successfully retrieved university: {university_code}")
        return APIResponse.ok(university.to_dict())

    except ClientError as e:
        logger.error(f"DynamoDB error: {str(e)}")
        return APIResponse.internal_error('Failed to fetch university')

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        return APIResponse.internal_error('An unexpected error occurred')
