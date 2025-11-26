import json
from typing import Dict, Any

from constants import constants


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


def create_response(status_code: int, body: Dict[str, Any], headers: Dict[str, str] = None) -> Dict[str, Any]:
    default_headers = constants.DEFAULT_HEADERS

    if headers:
        default_headers.update(headers)

    return {
        'statusCode': status_code,
        'headers': default_headers,
        'body': json.dumps(body)
    }
