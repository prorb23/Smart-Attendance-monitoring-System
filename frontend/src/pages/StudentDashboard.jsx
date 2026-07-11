import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { attendanceAPI } from '@/services/api';
import { GraduationCap, Calendar, TrendingUp, CheckCircle2, BookOpen } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentRecords, setRecentRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const student = user?.student;
  const studentId = student?.student_id;

  useEffect(() => {
    if (studentId) fetchData();
  }, [studentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      const [statsRes, recordsRes] = await Promise.all([
        attendanceAPI.getStudentStats(studentId),
        attendanceAPI.getStudentAttendance(studentId),
      ]);

      setStats(statsRes.data);
      setRecentRecords((recordsRes.data.records || []).slice(0, 10));
    } catch (error) {
      console.error('Failed to fetch student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    if (student?.name) {
      return student.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return 'ST';
  };

  const donutData = stats ? [
    { name: 'Present', value: stats.classes_attended },
    { name: 'Absent', value: Math.max(0, stats.total_classes - stats.classes_attended) },
  ] : [];

  const DONUT_COLORS = ['hsl(262, 83%, 58%)', 'hsl(240, 3.7%, 25%)'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome back, {student?.name?.split(' ')[0]}!</h1>
        <p className="text-muted-foreground text-sm mt-1">Here's your attendance overview</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:row-span-2 animate-fade-in">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-20 w-20 mb-4">
                <AvatarFallback className="text-xl bg-primary/10 text-primary">{getInitials()}</AvatarFallback>
              </Avatar>
              <h2 className="text-lg font-bold">{student?.name}</h2>
              <Badge variant="secondary" className="mt-2 font-mono">{student?.student_id}</Badge>

              <div className="w-full mt-6 space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5" />
                    Department
                  </span>
                  <span className="text-sm font-medium">{student?.department}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <GraduationCap className="w-3.5 h-3.5" />
                    Semester
                  </span>
                  <span className="text-sm font-medium">{student?.semester}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    Roll Number
                  </span>
                  <span className="text-sm font-medium">{student?.roll_number}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Donut */}
        <Card className="animate-fade-in" style={{ animationDelay: '100ms' }}>
          <CardHeader className="pb-0">
            <CardTitle className="text-base font-semibold">Attendance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px] flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(240, 10%, 6%)',
                      border: '1px solid hsl(240, 3.7%, 15.9%)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold">{stats?.attendance_percentage || 0}%</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Attendance</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="space-y-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.classes_attended || 0}</p>
                <p className="text-xs text-muted-foreground">Days Present</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.total_classes || 0}</p>
                <p className="text-xs text-muted-foreground">Total Class Days</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.attendance_percentage || 0}%</p>
                <p className="text-xs text-muted-foreground">Overall Rate</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Records */}
      <Card className="animate-fade-in" style={{ animationDelay: '300ms' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Recent Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          {recentRecords.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.date}</TableCell>
                    <TableCell className="text-muted-foreground">{record.time}</TableCell>
                    <TableCell>
                      <Badge variant="success">Present</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No attendance records yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
