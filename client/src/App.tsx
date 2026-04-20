import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { MessageUnreadProvider } from './context/MessageUnreadContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Landing } from './pages/auth/Landing';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { StudentProfile } from './pages/student/StudentProfile';
import { StudentSettings } from './pages/student/StudentSettings';
import { PositionList } from './pages/student/PositionList';
import { PositionDetail } from './pages/student/PositionDetail';
import { StudentApplications } from './pages/student/StudentApplications';
import { PIDashboard } from './pages/pi/PIDashboard';
import { PIProfile } from './pages/pi/PIProfile';
import { PositionNew } from './pages/pi/PositionNew';
import { PositionEdit } from './pages/pi/PositionEdit';
import { PositionApplications } from './pages/pi/PositionApplications';
import { StudentList } from './pages/pi/StudentList';
import { StudentDetail } from './pages/pi/StudentDetail';
import { LabRoster } from './pages/pi/LabRoster';
import { Inbox } from './pages/shared/Inbox';
import { ChatView } from './pages/shared/ChatView';
import { MessagesPage } from './pages/MessagesPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MessageUnreadProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route
            path="/student"
            element={
              <ProtectedRoute role="student">
                <Outlet />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="profile" element={<StudentProfile />} />
            <Route path="settings" element={<StudentSettings />} />
            <Route path="positions" element={<PositionList />} />
            <Route path="positions/:id" element={<PositionDetail />} />
            <Route path="applications" element={<StudentApplications />} />
            <Route path="inbox" element={<Inbox />} />
            <Route path="inbox/:conversationId" element={<ChatView />} />
          </Route>
          <Route
            path="/pi"
            element={
              <ProtectedRoute role="pi">
                <Outlet />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<PIDashboard />} />
            <Route path="roster" element={<LabRoster />} />
            <Route path="profile" element={<PIProfile />} />
            <Route path="positions/new" element={<PositionNew />} />
            <Route path="positions/:id/edit" element={<PositionEdit />} />
            <Route path="positions/:id/applications" element={<PositionApplications />} />
            <Route path="students" element={<StudentList />} />
            <Route path="students/:id" element={<StudentDetail />} />
            <Route path="inbox" element={<Inbox />} />
            <Route path="inbox/:conversationId" element={<ChatView />} />
          </Route>
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <Outlet />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<AdminDashboard />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </BrowserRouter>
        </MessageUnreadProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
