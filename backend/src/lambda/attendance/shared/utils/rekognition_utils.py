import logging
from typing import Dict, Any, Optional

from utils.aws_utils import get_client_for_resource

logger = logging.getLogger()


class FaceComparisonResult:
    """Result of face comparison operation."""

    def __init__(
        self,
        success: bool,
        similarity_score: Optional[float] = None,
        error_message: Optional[str] = None,
        error_code: Optional[str] = None
    ):
        self.success = success
        self.similarity_score = similarity_score
        self.error_message = error_message
        self.error_code = error_code

    def to_dict(self) -> Dict[str, Any]:
        return {
            'success': self.success,
            'similarity_score': self.similarity_score,
            'error_message': self.error_message,
            'error_code': self.error_code
        }


def compare_faces_with_rekognition(
    source_s3_key: str,
    target_s3_key: str,
    bucket_name: str,
    similarity_threshold: float = 80.0
) -> FaceComparisonResult:
    """
    Compare two faces using AWS Rekognition.

    Args:
        source_s3_key: S3 key of the registered face (reference image)
        target_s3_key: S3 key of the attendance face (image to verify)
        bucket_name: S3 bucket name containing both images
        similarity_threshold: Minimum similarity score (default 80.0)

    Returns:
        FaceComparisonResult: Contains success status, similarity score, and error details
    """
    rekognition_client = get_client_for_resource('rekognition')

    try:
        logger.info(
            f"Comparing faces - Source: {source_s3_key}, Target: {target_s3_key}, "
            f"Threshold: {similarity_threshold}"
        )

        # Call Rekognition CompareImages API
        response = rekognition_client.compare_faces(
            SourceImage={
                'S3Object': {
                    'Bucket': bucket_name,
                    'Name': source_s3_key
                }
            },
            TargetImage={
                'S3Object': {
                    'Bucket': bucket_name,
                    'Name': target_s3_key
                }
            },
            SimilarityThreshold=similarity_threshold
        )

        # Check if any face matches were found
        face_matches = response.get('FaceMatches', [])
        unmatched_faces = response.get('UnmatchedFaces', [])

        if not face_matches:
            # No matches found - could be below threshold or no face detected
            if unmatched_faces:
                # Face was detected but similarity is below threshold
                logger.warning(
                    f"Face detected but similarity below threshold. "
                    f"Unmatched faces count: {len(unmatched_faces)}"
                )
                return FaceComparisonResult(
                    success=False,
                    similarity_score=None,
                    error_message="Face verification failed: Similarity below threshold. Please ensure good lighting and face the camera directly.",
                    error_code="SIMILARITY_BELOW_THRESHOLD"
                )
            else:
                # No face detected in target image
                logger.warning("No face detected in the attendance image")
                return FaceComparisonResult(
                    success=False,
                    similarity_score=None,
                    error_message="No face detected in image. Please ensure your face is clearly visible and try again.",
                    error_code="NO_FACE_DETECTED"
                )

        # Get the best match (highest similarity)
        best_match = face_matches[0]
        similarity_score = best_match['Similarity']
        face_details = best_match['Face']

        logger.info(
            f"Face match found - Similarity: {similarity_score:.2f}%, "
            f"Confidence: {face_details.get('Confidence', 0):.2f}%"
        )

        # Check if multiple faces were detected
        if len(face_matches) > 1:
            logger.warning(f"Multiple matching faces detected: {len(face_matches)}")
            return FaceComparisonResult(
                success=False,
                similarity_score=similarity_score,
                error_message=f"Multiple faces detected in image (found {len(face_matches)} matches). Please ensure only your face is visible and try again.",
                error_code="MULTIPLE_FACES_DETECTED"
            )

        # Success - face verified
        return FaceComparisonResult(
            success=True,
            similarity_score=similarity_score,
            error_message=None,
            error_code=None
        )

    except rekognition_client.exceptions.InvalidParameterException as e:
        logger.error(f"Invalid parameter for Rekognition: {str(e)}")
        return FaceComparisonResult(
            success=False,
            similarity_score=None,
            error_message="Invalid image format or parameters. Please upload a clear photo of your face.",
            error_code="INVALID_PARAMETER"
        )

    except rekognition_client.exceptions.ImageTooLargeException as e:
        logger.error(f"Image too large: {str(e)}")
        return FaceComparisonResult(
            success=False,
            similarity_score=None,
            error_message="Image size too large. Please upload a smaller image (max 15MB).",
            error_code="IMAGE_TOO_LARGE"
        )

    except rekognition_client.exceptions.InvalidS3ObjectException as e:
        logger.error(f"Invalid S3 object: {str(e)}")
        return FaceComparisonResult(
            success=False,
            similarity_score=None,
            error_message="Image not found or inaccessible. Please try uploading again.",
            error_code="IMAGE_NOT_FOUND"
        )

    except rekognition_client.exceptions.InvalidImageFormatException as e:
        logger.error(f"Invalid image format: {str(e)}")
        return FaceComparisonResult(
            success=False,
            similarity_score=None,
            error_message="Invalid image format. Please upload a JPEG or PNG image.",
            error_code="INVALID_IMAGE_FORMAT"
        )

    except rekognition_client.exceptions.ProvisionedThroughputExceededException as e:
        logger.error(f"Rekognition throttled: {str(e)}")
        # Don't return a result - let this propagate so SQS can retry
        raise Exception("Face recognition service temporarily unavailable. Retrying...") from e

    except Exception as e:
        logger.error(f"Unexpected error during face comparison: {str(e)}", exc_info=True)
        # For unexpected errors, let SQS retry
        raise Exception(f"Face comparison failed: {str(e)}") from e


def validate_face_image_quality(
    s3_key: str,
    bucket_name: str
) -> Dict[str, Any]:
    """
    Validate image quality using Rekognition DetectFaces.
    Can be used to pre-validate images before comparison.

    Args:
        s3_key: S3 key of the image
        bucket_name: S3 bucket name

    Returns:
        dict: Quality information including face count, confidence, etc.
    """
    rekognition_client = get_client_for_resource('rekognition')

    try:
        response = rekognition_client.detect_faces(
            Image={
                'S3Object': {
                    'Bucket': bucket_name,
                    'Name': s3_key
                }
            },
            Attributes=['ALL']
        )

        face_details = response.get('FaceDetails', [])

        return {
            'valid': len(face_details) == 1,
            'face_count': len(face_details),
            'details': face_details[0] if face_details else None
        }

    except Exception as e:
        logger.error(f"Error validating image quality: {str(e)}")
        return {
            'valid': False,
            'face_count': 0,
            'error': str(e)
        }
