import { Navigate, useLocation } from 'react-router-dom';

/**
 * Legacy route /mentor-availability/ merged into the unified Đăng ký lịch dạy workspace (/mentor-shift-schedule/).
 * Redirects bookmarks and deep links cleanly while preserving query strings.
 */
export default function MentorAvailabilityRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/mentor-shift-schedule/${search || ''}`} replace />;
}
