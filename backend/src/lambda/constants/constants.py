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
