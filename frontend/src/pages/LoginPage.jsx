import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GraduationCap, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';

const ROLES = ['admin', 'student'];

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeRole, setActiveRole] = useState('admin');

  const { login } = useAuth();
  const navigate = useNavigate();

  const resetForm = (role) => {
    setActiveRole(role);
    setUsername('');
    setPassword('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setError('Please enter both your credentials.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const finalUser = activeRole === 'student' ? trimmedUser.toUpperCase() : trimmedUser;
      const result = await login(finalUser, password);
      if (result.success) {
        navigate(result.role === 'admin' ? '/admin/dashboard' : '/student/dashboard');
      } else {
        setError(result.message);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4 animate-scale-in">
        <Card className="border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl shadow-purple-500/10">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary shadow-xl shadow-primary/30 animate-pulse-glow">
                <GraduationCap className="w-8 h-8 text-white" aria-hidden="true" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              Welcome to <span className="gradient-text">AttendAI</span>
            </CardTitle>
            <CardDescription className="text-white/60 mt-1">
              Smart Attendance Management
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            {/* Role toggle */}
            <div className="flex rounded-lg bg-white/5 border border-white/10 p-1 mb-6" role="tablist" aria-label="Login as">
              {ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  role="tab"
                  aria-selected={activeRole === role}
                  onClick={() => resetForm(role)}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium capitalize transition-all duration-200 ${
                    activeRole === role
                      ? 'bg-primary text-white shadow-md'
                      : 'text-white/60 hover:text-white/80'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in"
              >
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="username" className="text-white/80 text-xs font-medium uppercase tracking-wider">
                  {activeRole === 'admin' ? 'Username' : 'Student ID'}
                </Label>
                <Input
                  id="username"
                  type="text"
                  autoComplete={activeRole === 'admin' ? 'username' : 'off'}
                  placeholder={activeRole === 'admin' ? 'Enter username' : 'Enter student ID'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-primary/50 h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/80 text-xs font-medium uppercase tracking-wider">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-primary/50 h-11 pr-10"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg shadow-primary/25 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                    Signing in…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" aria-hidden="true" />
                    Sign In
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-6 p-3 rounded-lg bg-white/5 border border-white/5">
              <p className="text-[11px] text-white/40 text-center">
                {activeRole === 'admin'
                  ? 'Sign in with your administrator credentials'
                  : 'Use your Student ID and password to sign in'}
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-white/30 mt-6">
          Powered by ASR Technology
        </p>
      </div>
    </div>
  );
}
