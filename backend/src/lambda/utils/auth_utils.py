import json
from enum import Enum
from typing import Dict, List, Any


class UserRole(str, Enum):
    """Enum for user roles matching Cognito Group names."""
    ADMIN = "Admin"
    INSTRUCTOR = "Instructor"
    STUDENT = "Student"


class AuthorizationError(Exception):
    """Exception raised when user lacks required authorization."""
    pass


def extract_user_context(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract user_id, email, and groups from Cognito authorizer claims.

    Args:
        event: API Gateway event containing request context with Cognito claims

    Returns:
        Dictionary with user_id, email, and list of group names

    Example:
        {
            'user_id': 'abc-123-def',
            'email': 'user@example.com',
            'groups': ['Student', 'Admin']
        }
    """
    claims = event['requestContext']['authorizer']['claims']
    groups_str = claims.get('cognito:groups', '')

    # Parse comma-separated groups string
    groups = [g.strip() for g in groups_str.split(',')] if groups_str else []

    return {
        'user_id': claims['sub'],
        'email': claims.get('email', ''),
        'groups': groups
    }


def require_role(event: Dict[str, Any], required_roles: List[str]) -> Dict[str, Any]:
    """
    Validate that user has at least one of the required roles.

    Args:
        event: API Gateway event
        required_roles: List of role names (e.g., ['Admin', 'Instructor'])

    Returns:
        User context dictionary if authorized

    Raises:
        AuthorizationError: If user lacks all required roles

    Usage:
        try:
            user_context = require_role(event, [UserRole.ADMIN])
            user_id = user_context['user_id']
        except AuthorizationError:
            return create_forbidden_response()
    """
    user_context = extract_user_context(event)

    # Check if user has at least one of the required roles
    if not any(role in user_context['groups'] for role in required_roles):
        raise AuthorizationError(f"Required roles: {required_roles}, user has: {user_context['groups']}")

    return user_context


def is_admin(event: Dict[str, Any]) -> bool:
    """Check if user is in Admin group."""
    user_context = extract_user_context(event)
    return UserRole.ADMIN in user_context['groups']


def is_instructor(event: Dict[str, Any]) -> bool:
    """Check if user is in Instructor group."""
    user_context = extract_user_context(event)
    return UserRole.INSTRUCTOR in user_context['groups']


def is_student(event: Dict[str, Any]) -> bool:
    """Check if user is in Student group."""
    user_context = extract_user_context(event)
    return UserRole.STUDENT in user_context['groups']


def create_forbidden_response() -> Dict[str, Any]:
    """
    Create a standard 403 Forbidden response for authorization failures.

    Returns:
        API Gateway response dict with 403 status code
    """
    return {
        'statusCode': 403,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': 'true',
        },
        'body': json.dumps({
            'message': 'Forbidden: Insufficient permissions'
        })
    }


def create_unauthorized_response() -> Dict[str, Any]:
    """
    Create a standard 401 Unauthorized response for missing/invalid authentication.

    Returns:
        API Gateway response dict with 401 status code
    """
    return {
        'statusCode': 401,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': 'true',
        },
        'body': json.dumps({
            'message': 'Unauthorized: Authentication required'
        })
    }
