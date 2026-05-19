import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import DashboardRouter from './pages/DashboardRouter';
import AppShell from './components/Layout/AppShell';
import UserManagement from './pages/UserManagement';
import LabsManagement from './pages/LabsManagement';
import ChemicalInventory from './pages/ChemicalInventory';
import Transfers from './pages/Transfers';
import EquipmentList from './pages/EquipmentList';
import UtensilsList from './pages/UtensilsList';
import MyLabStock from './pages/MyLabStock';
import ICTDashboard from './pages/ICTDashboard';
import ICTHardwareList from './pages/ICTHardwareList';
import LicenseList from './pages/LicenseList';
import AlertsList from './pages/AlertsList';
import Reports from './pages/Reports';
import UtilityList from './pages/UtilityList';
import EmployeeAssignments from './pages/EmployeeAssignments';
import BottleInventory from './pages/BottleInventory';       
import OpenBottle from './pages/OpenBottle';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><AppShell /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="labs" element={<LabsManagement />} />
        <Route path="chemicals" element={<ChemicalInventory />} />
        <Route path="transfers" element={<Transfers />} />
        <Route path="equipment" element={<EquipmentList />} />
        <Route path="utensils" element={<UtensilsList />} />
        <Route path="stock" element={<MyLabStock />} />
        <Route path="ict-dashboard" element={<ICTDashboard />} />
        <Route path="ict-hardware" element={<ICTHardwareList />} />
        <Route path="ict-licenses" element={<LicenseList />} />
        <Route path="alerts" element={<AlertsList />} />
        <Route path="reports" element={<Reports />} />
        <Route path="utilities" element={<UtilityList />} />
        <Route path="dashboard" element={<DashboardRouter />} />
        <Route path="ict-assignments" element={<EmployeeAssignments />} />
        <Route path="bottles" element={<BottleInventory />} />   {/* NEW */}
        {/* for QR code redirect, we need a route that handles /chemicals/open */}
        <Route path="chemicals/open" element={<PrivateRoute><OpenBottle /></PrivateRoute>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <MantineProvider>
      <Notifications />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </MantineProvider>
  );
}