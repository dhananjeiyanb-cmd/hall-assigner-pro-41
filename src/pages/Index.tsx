
import { useState } from 'react';
import Layout from '@/components/Layout';
import Dashboard from '@/components/Dashboard';
import StudentManagement from '@/components/StudentManagement';
import ClassroomManagement from '@/components/ClassroomManagement';
import ExcelUpload from '@/components/ExcelUpload';
import LoginForm from '@/components/LoginForm';
import SeatAllocation from '@/components/SeatAllocation';
import Reports from '@/components/Reports';
import Settings from '@/components/Settings';

const Index = () => {
  const [currentUser, setCurrentUser] = useState<{ type: 'faculty' | 'student'; data: any } | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');

  const handleLogin = (userType: 'faculty' | 'student', userData: any) => {
    setCurrentUser({ type: userType, data: userData });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentPage('dashboard');
  };

  if (!currentUser) {
    return <LoginForm onLogin={handleLogin} />;
  }

  const renderPage = () => {
    // Faculty-only pages
    if (currentUser.type === 'faculty') {
      switch (currentPage) {
        case 'dashboard':
          return <Dashboard userType={currentUser.type} userData={currentUser.data} />;
        case 'students':
          return <StudentManagement />;
        case 'excel-upload':
          return <ExcelUpload />;
        case 'classrooms':
          return <ClassroomManagement />;
        case 'allocations':
          return <SeatAllocation />;
        case 'reports':
          return <Reports />;
        case 'settings':
          return <Settings />;
        default:
          return <Dashboard userType={currentUser.type} userData={currentUser.data} />;
      }
    }

    // Student pages
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard userType={currentUser.type} userData={currentUser.data} />;
      case 'seating':
        return (
          <div className="text-center py-20">
            <h2 className="text-2xl font-semibold mb-4">My Seating Arrangements</h2>
            <p className="text-muted-foreground">View your assigned seats for upcoming exams</p>
            <p className="text-sm text-muted-foreground mt-2">Check your dashboard for seating details</p>
          </div>
        );
      case 'profile':
        return (
          <div className="text-center py-20">
            <h2 className="text-2xl font-semibold mb-4">My Profile</h2>
            <p className="text-muted-foreground">View and update your personal information</p>
            <p className="text-sm text-muted-foreground mt-2">Coming soon...</p>
          </div>
        );
      default:
        return <Dashboard userType={currentUser.type} userData={currentUser.data} />;
    }
  };

  return (
    <Layout 
      currentPage={currentPage} 
      onNavigate={setCurrentPage}
      userType={currentUser.type}
      userData={currentUser.data}
      onLogout={handleLogout}
    >
      {renderPage()}
    </Layout>
  );
};

export default Index;
