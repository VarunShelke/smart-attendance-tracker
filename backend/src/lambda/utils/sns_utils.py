import logging
from typing import Optional

from utils.aws_utils import get_client_for_resource

logger = logging.getLogger()


def subscribe_user_to_notifications(
        topic_arn: str,
        user_email: str
) -> str:
    """
    Subscribe user email to an attendance notification topic.

    Args:
        topic_arn: ARN of the notification topic
        user_email: User's email address

    Returns:
        Subscription ARN

    Raises:
        Exception: If subscription fails
    """
    sns_client = get_client_for_resource('sns')

    try:
        response = sns_client.subscribe(
            TopicArn=topic_arn,
            Protocol='email',
            Endpoint=user_email,
            ReturnSubscriptionArn=True
        )
        subscription_arn = response['SubscriptionArn']

        logger.info(
            f"Subscribed {user_email} to notification topic. "
            f"Subscription ARN: {subscription_arn}"
        )

        return subscription_arn

    except Exception as e:
        logger.error(f"Failed to subscribe {user_email} to SNS topic: {str(e)}")
        raise Exception(f"Failed to subscribe to notification topic: {str(e)}")


def publish_attendance_notification(
        topic_arn: str,
        status: str,
        similarity_score: Optional[float] = None,
        error_message: Optional[str] = None
) -> None:
    """
    Publish an attendance notification message to an SNS topic.
    Message content varies based on verification status.

    Args:
        topic_arn: ARN of the notification topic
        status: Verification status ('verified' or 'failed')
        similarity_score: Face similarity score (0-100), optional
        error_message: Error message if verification failed, optional

    Raises:
        Exception: If publish fails
    """
    sns_client = get_client_for_resource('sns')

    # Prepare email content based on status
    if status == 'verified':
        subject = "✅ Attendance Verified Successfully"

        # Build success message with optional similarity score
        message_lines = [
            "Hello,",
            "",
            "Your attendance has been successfully verified!",
            ""
        ]

        if similarity_score is not None:
            message_lines.extend([
                "Verification Details:",
                f"- Face Match Confidence: {similarity_score:.1f}%",
                ""
            ])

        message_lines.extend([
            "Please log in to your Smart Attendance Tracker account to view complete details including:",
            "- Verification timestamp",
            "- Attendance history",
            "- Full verification report",
            "",
            "Thank you for using Smart Attendance Tracker.",
            "",
            "---",
            "Smart Attendance Team",
            "",
            "Note: This is an automated notification. Please do not reply to this email."
        ])

        message = "\n".join(message_lines)

    else:  # status == 'failed'
        subject = "❌ Attendance Verification Failed"

        message_lines = [
            "Hello,",
            "",
            "Your recent attendance verification attempt was unsuccessful.",
            ""
        ]

        if error_message:
            message_lines.extend([
                "Reason:",
                f"- {error_message}",
                ""
            ])

        if similarity_score is not None:
            message_lines.extend([
                f"Face Match Score: {similarity_score:.1f}% (Threshold: 80.0%)",
                ""
            ])

        message_lines.extend([
            "Please try again with the following tips:",
            "- Ensure good lighting conditions",
            "- Keep your face clearly visible and centered",
            "- Make sure only your face is in the frame",
            "- Avoid wearing sunglasses or face coverings",
            "- Hold the camera steady",
            "",
            "Log in to your Smart Attendance Tracker account to:",
            "- View the detailed failure reason",
            "- Retry attendance verification",
            "- View your attendance history",
            "",
            "---",
            "Smart Attendance Team",
            "",
            "If you continue experiencing issues, please contact support.",
            "",
            "Note: This is an automated notification. Please do not reply to this email."
        ])

        message = "\n".join(message_lines)

    try:
        response = sns_client.publish(
            TopicArn=topic_arn,
            Subject=subject,
            Message=message
        )

        logger.info(
            f"Published {status} notification. "
            f"Message ID: {response['MessageId']}, "
            f"Similarity: {similarity_score}"
        )

    except Exception as e:
        logger.error(f"Failed to publish {status} notification: {str(e)}")
        raise Exception(f"Failed to send {status} notification: {str(e)}")


def unsubscribe_from_topic(subscription_arn: str) -> None:
    """
    Unsubscribe a user from an SNS topic.

    Args:
        subscription_arn: ARN of the subscription to remove

    Raises:
        Exception: If unsubscribe fails
    """
    sns_client = get_client_for_resource('sns')

    try:
        sns_client.unsubscribe(SubscriptionArn=subscription_arn)
        logger.info(f"Unsubscribed from topic. Subscription ARN: {subscription_arn}")

    except Exception as e:
        logger.error(f"Failed to unsubscribe: {str(e)}")
        raise Exception(f"Failed to unsubscribe from notifications: {str(e)}")
