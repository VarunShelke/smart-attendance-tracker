DEFAULT_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key',
}

# DynamoDB Table Names
STUDENTS_TABLE_NAME = 'attendance-tracker-students'
STUDENT_ATTENDANCE_TABLE_NAME = 'attendance-tracker-student-attendance'

# Face Recognition
FACE_SIMILARITY_THRESHOLD = 80.0
ATTENDANCE_FOLDER_PREFIX = 'faces/attendance'
FACE_REGISTRATION_PREFIX = 'face_registrations'

# SQS Configuration
SQS_BATCH_SIZE = 5
SQS_MAX_RECEIVE_COUNT = 3

# Lambda Timeouts (in seconds)
COMPARE_FACE_LAMBDA_TIMEOUT = 45
PROCESS_ATTENDANCE_LAMBDA_TIMEOUT = 29

# SNS Topic
SNS_TOPIC_NAME = 'attendance-notifications'
