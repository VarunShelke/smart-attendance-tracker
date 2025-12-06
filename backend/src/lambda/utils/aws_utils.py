from typing import Any

import boto3
from botocore.client import BaseClient


def get_client_for_resource(resource_name: str) -> BaseClient:
    return boto3.client(resource_name)


def get_dynamodb_resource() -> Any:
    return boto3.resource('dynamodb')
