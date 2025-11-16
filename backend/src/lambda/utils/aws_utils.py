import boto3
from botocore.client import BaseClient


def get_client_for_resource(resource_name: str) -> BaseClient:
    return boto3.client(resource_name)
