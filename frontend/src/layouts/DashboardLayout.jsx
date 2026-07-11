import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  Users,
  Camera,
  ScanFace,
  ClipboardList,
  UserCircle,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  GraduationCap,
  Key,
} from 'lucide-react';
import ChangePasswordModal from '@/components/ChangePasswordModal';

const adminMenuItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/students', label: 'Students', icon: Users },
  { path: '/admin/faces', label: 'Face Registration', icon: Camera },
  { path: '/admin/attendance/mark', label: 'Mark Attendance', icon: ScanFace },
  { path: '/admin/attendance/history', label: 'Attendance History', icon: ClipboardList },
];

const studentMenuItems = [
  { path: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/student/attendance', label: 'My Attendance', icon: ClipboardList },
  { path: '/student/profile', label: 'Profile', icon: UserCircle },
];

export default function DashboardLayout({ children }) {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  const menuItems = isAdmin ? adminMenuItems : studentMenuItems;

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = () => {
    if (isAdmin) return 'AD';
    if (user?.student?.name) {
      return user.student.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return 'U';
  };

  const getDisplayName = () => {
    if (isAdmin) return 'Administrator';
    return user?.student?.name || user?.username || 'Student';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-sidebar-background border-r border-sidebar-border flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary shadow-lg shadow-primary/25">
            <GraduationCap className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-bold text-sidebar-foreground tracking-tight">AttendAI</h1>
            <p className="text-[11px] text-muted-foreground font-medium">Smart Attendance</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-sidebar-foreground hover:text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <Separator className="mx-4 w-auto" />

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-primary/20'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
              >
                <Icon className={`w-[18px] h-[18px] transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-3 mt-auto">
          <Separator className="mb-3" />
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent/50">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-xs">{getInitials()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{getDisplayName()}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
          </div>
          <div className="flex flex-col gap-1 mt-2 px-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPasswordModalOpen(true)}
              className="w-full justify-start gap-2 h-8 text-xs text-sidebar-foreground"
            >
              <Key className="w-3.5 h-3.5" />
              Change Password
            </Button>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDarkMode(!darkMode)}
                className="flex-1 justify-start gap-2 h-8 text-xs text-sidebar-foreground"
              >
                {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                {darkMode ? 'Light' : 'Dark'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="flex-1 justify-start gap-2 h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-4 lg:px-6 h-14 border-b border-border bg-background/80 backdrop-blur-md shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-foreground hover:text-primary transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          <p className="text-xs text-muted-foreground hidden sm:block">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </div>
      </main>

      {/* Change Password Modal */}
      <ChangePasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
      />
    </div>
  );
}
