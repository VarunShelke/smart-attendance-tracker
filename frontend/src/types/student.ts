/**
 * Student profile interface representing the data returned from the API
 */
export interface StudentProfile {
  student_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  face_registered: boolean;
  face_registered_at: string | null;
}

/**
 * Error response from the student profile API
 */
export interface StudentProfileError {
  message: string;
}
