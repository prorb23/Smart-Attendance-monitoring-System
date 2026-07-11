import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/layouts/DashboardLayout';
import LoginPage from '@/pages/LoginPage';
import AdminDashboard from '@/pages/AdminDashboard';
import StudentDashboard from '@/pages/StudentDashboard';
import StudentManagement from '@/pages/StudentManagement';
import FaceRegistration from '@/pages/FaceRegistration';
import MarkAttendance from '@/pages/MarkAttendance';
import AttendanceHistory from '@/pages/AttendanceHistory';
import ProfilePage from '@/pages/ProfilePage';

function AdminRoute({ children }) {
  return (
    <ProtectedRoute requiredRole="admin">
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function StudentRoute({ children }) {
  return (
    <ProtectedRoute requiredRole="student">
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/students" element={<AdminRoute><StudentManagement /></AdminRoute>} />
          <Route path="/admin/faces" element={<AdminRoute><FaceRegistration /></AdminRoute>} />
          <Route path="/admin/attendance/mark" element={<AdminRoute><MarkAttendance /></AdminRoute>} />
          <Route path="/admin/attendance/history" element={<AdminRoute><AttendanceHistory /></AdminRoute>} />

          {/* Student Routes */}
          <Route path="/student/dashboard" element={<StudentRoute><StudentDashboard /></StudentRoute>} />
          <Route path="/student/attendance" element={<StudentRoute><AttendanceHistory /></StudentRoute>} />
          <Route path="/student/profile" element={<StudentRoute><ProfilePage /></StudentRoute>} />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
