import { Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Students from './pages/Students.jsx';
import Teachers from './pages/Teachers.jsx';
import Registrations from './pages/Registrations.jsx';
import Settings from './pages/Settings.jsx';
import Groups from './pages/Groups.jsx';
import Activities from './pages/Activities.jsx';
import Courses from './pages/Courses.jsx';
import Absences from './pages/Absences.jsx';
import Expenses from './pages/Expenses.jsx';
import Donations from './pages/Donations.jsx';
import BackupPage from './pages/BackupPage.jsx';
import Users from './pages/Users.jsx';
import Competitions from './pages/Competitions.jsx';

function RequireAuth({ children }) {
  const { isAuth, authLoading } = useStore();
  if (authLoading) return null; // or a spinner
  return isAuth ? children : <Navigate to="/login" replace />;
}

function RequireAdmin({ children }) {
  const { isAdmin, authLoading } = useStore();
  if (authLoading) return null; // or a spinner
  return isAdmin ? children : <Navigate to="/students" replace />;
}

export default function App() {
  const { isAuth, authLoading } = useStore();

  if (authLoading) return null; // or a spinner

  return (
    <Routes>
      <Route path="/login" element={isAuth ? <Navigate to="/" replace /> : <Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route
          index
          element={
            <RequireAdmin>
              <Dashboard />
            </RequireAdmin>
          }
        />
        <Route path="students" element={<Students />} />
        <Route path="teachers" element={<Teachers />} />
        <Route path="registrations" element={<Registrations />} />
        <Route path="groups" element={<Groups />} />
        <Route path="activities" element={<Activities />} />
        <Route path="courses" element={<Courses />} />
        <Route path="/absences" element={<Absences />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/donations" element={<Donations />} />
        <Route path="/competitions" element={<Competitions />} />
        <Route path="/backup" element={<BackupPage />} />
        <Route 
          path="/users" 
          element={
             <RequireAdmin>
                <Users />
            </RequireAdmin>
          } />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}