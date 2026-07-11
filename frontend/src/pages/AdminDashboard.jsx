import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { attendanceAPI } from '@/services/api';
import { Users, UserCheck, UserX, TrendingUp, Clock } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts';

function StatCard({ title, value, icon: Icon, color, delay = 0 }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const numValue = parseFloat(value) || 0;
    const steps = 30;
    const stepDuration = 1000 / steps;
    let current = 0;
    let intervalId = null;

    const timerId = setTimeout(() => {
      intervalId = setInterval(() => {
        current += numValue / steps;
        if (current >= numValue) {
          setDisplayValue(numValue);
          clearInterval(intervalId);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, stepDuration);
    }, delay);

    return () => {
      clearTimeout(timerId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [value, delay]);

  const colorMap = {
    purple: 'from-purple-500 to-purple-700',
    green: 'from-emerald-500 to-emerald-700',
    red: 'from-rose-500 to-rose-700',
    blue: 'from-blue-500 to-blue-700',
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 animate-fade-in"
          style={{ animationDelay: `${delay}ms` }}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1 tracking-tight animate-count-up">
              {typeof value === 'string' && value.includes('%')
                ? `${displayValue}%`
                : displayValue}
            </p>
          </div>
          <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[color]} shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, trendsRes, monthlyRes, attendanceRes] = await Promise.all([
        attendanceAPI.getStats(),
        attendanceAPI.getTrends(7),
        attendanceAPI.getMonthlyTrends(6),
        attendanceAPI.list({ page: 1, page_size: 8 }),
      ]);

      setStats(statsRes.data);
      setTrends(trendsRes.data);
      setMonthlyTrends(monthlyRes.data);
      setRecentAttendance(attendanceRes.data.records || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of attendance metrics</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Students" value={stats?.total_students || 0} icon={Users} color="purple" delay={0} />
        <StatCard title="Present Today" value={stats?.present_today || 0} icon={UserCheck} color="green" delay={100} />
        <StatCard title="Absent Today" value={stats?.absent_today || 0} icon={UserX} color="red" delay={200} />
        <StatCard title="Attendance %" value={`${stats?.attendance_percentage || 0}%`} icon={TrendingUp} color="blue" delay={300} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 7-Day Trend */}
        <Card className="animate-fade-in" style={{ animationDelay: '400ms' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">7-Day Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends}>
                  <defs>
                    <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(240, 3.8%, 46.1%)' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(240, 3.8%, 46.1%)' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(240, 10%, 6%)',
                      border: '1px solid hsl(240, 3.7%, 15.9%)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '12px',
                    }}
                    formatter={(value, name) => [value, name === 'count' ? 'Present' : name]}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(262, 83%, 58%)"
                    strokeWidth={2}
                    fill="url(#colorAttendance)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card className="animate-fade-in" style={{ animationDelay: '500ms' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Monthly Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(240, 3.8%, 46.1%)' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(240, 3.8%, 46.1%)' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(240, 10%, 6%)',
                      border: '1px solid hsl(240, 3.7%, 15.9%)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(262, 83%, 58%)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Attendance */}
      <Card className="animate-fade-in" style={{ animationDelay: '600ms' }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Recent Attendance
            </CardTitle>
            <Badge variant="secondary" className="text-xs">{recentAttendance.length} records</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {recentAttendance.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentAttendance.map((record, idx) => (
                  <TableRow key={record.id || idx} className="animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                    <TableCell className="font-mono text-sm">{record.student_id}</TableCell>
                    <TableCell className="font-medium">{record.student_name}</TableCell>
                    <TableCell>{record.attendance_date}</TableCell>
                    <TableCell className="text-muted-foreground">{record.attendance_time}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No attendance records yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
