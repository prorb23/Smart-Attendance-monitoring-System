import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  UserCircle, GraduationCap, BookOpen, Hash,
  Building
} from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const student = user?.student;

  const getInitials = () => {
    if (student?.name) {
      return student.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return 'ST';
  };

  if (!student) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Profile data not available</p>
      </div>
    );
  }

  const profileFields = [
    { icon: Hash, label: 'Student ID', value: student.student_id },
    { icon: UserCircle, label: 'Full Name', value: student.name },
    { icon: Building, label: 'Department', value: student.department },
    { icon: GraduationCap, label: 'Semester', value: student.semester },
    { icon: BookOpen, label: 'Roll Number', value: student.roll_number },
  ];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Your personal information</p>
      </div>

      {/* Profile Card */}
      <Card className="overflow-hidden">
        {/* Header banner */}
        <div className="h-32 bg-gradient-to-br from-primary via-primary/80 to-purple-700 relative">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>

        <CardContent className="relative px-6 pb-6">
          {/* Avatar */}
          <div className="-mt-12 mb-4">
            <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold">{student.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="font-mono">{student.student_id}</Badge>
              <Badge variant="outline">{student.department}</Badge>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Profile Fields */}
          <div className="space-y-4">
            {profileFields.map((field, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors animate-fade-in"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
                  <field.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    {field.label}
                  </p>
                  <p className="text-sm font-semibold mt-0.5">{field.value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
