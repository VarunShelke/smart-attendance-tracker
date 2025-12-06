export interface AttendanceResponse {
  tracking_id: string;
  status: 'processing' | 'verified' | 'failed';
  sse_stream_url: string;
  message: string;
}

export interface AttendanceCaptureState {
  stage: 'initial' | 'camera' | 'captured' | 'submitting' | 'success' | 'error';
  capturedImage: string | null;
  trackingId: string | null;
  error: string | null;
  isLoading: boolean;
}
