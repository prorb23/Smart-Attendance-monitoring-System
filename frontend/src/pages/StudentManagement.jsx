import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table';
import { studentsAPI } from '@/services/api';
import {
  Plus, Search, Pencil, Trash2, UserCircle,
  Camera, AlertCircle, RefreshCw, Lock, Unlock
} from 'lucide-react';

const ID_PREFIX = 'STU';
const ID_PAD = 4; // e.g. STU0001

/**
 * Derive the next student ID from the current list.
 * Scans all existing IDs that match the prefix pattern, extracts their numeric
 * suffix, and returns prefix + (max + 1) zero-padded to ID_PAD digits.
 */
function generateNextId(students) {
  const re = new RegExp(`^${ID_PREFIX}(\\d+)$`, 'i');
  let max = 0;
  for (const s of students) {
    const m = s.student_id.match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${ID_PREFIX}${String(max + 1).padStart(ID_PAD, '0')}`;
}

const EMPTY_FORM = {
  student_id: '',
  name: '',
  roll_number: '',
  department: '',
  semester: '',
  password: '',
};

export default function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [deletingStudent, setDeletingStudent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [idLocked, setIdLocked] = useState(true); // controls whether ID field is editable

  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchStudents(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchStudents = async (searchTerm = '') => {
    try {
      const response = await studentsAPI.list(searchTerm);
      setStudents(response.data);
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoading(false);
    }
  };

  const openAddDialog = () => {
    setEditingStudent(null);
    setIdLocked(true);
    setFormData({ ...EMPTY_FORM, student_id: generateNextId(students) });
    setError('');
    setDialogOpen(true);
  };

  const openEditDialog = (student) => {
    setEditingStudent(student);
    setIdLocked(true);
    setFormData({
      student_id: student.student_id,
      name: student.name,
      roll_number: student.roll_number,
      department: student.department,
      semester: student.semester,
      password: '',
    });
    setError('');
    setDialogOpen(true);
  };

  const regenerateId = () => {
    setFormData(prev => ({ ...prev, student_id: generateNextId(students) }));
    setIdLocked(true);
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      if (editingStudent) {
        const updateData = { ...formData };
        delete updateData.student_id;
        if (!updateData.password) delete updateData.password;
        await studentsAPI.update(editingStudent.student_id, updateData);
      } else {
        if (!formData.password) {
          setError('Password is required for new students.');
          return;
        }
        await studentsAPI.create(formData);
      }
      setDialogOpen(false);
      fetchStudents(search);
    } catch (err) {
      const detail = err.response?.data?.detail;
      const errorMessage = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map(d => d.msg || 'Validation error').join(', ')
          : 'Failed to save student. Please try again.';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingStudent) return;
    try {
      await studentsAPI.delete(deletingStudent.student_id);
      setDeleteDialogOpen(false);
      setDeletingStudent(null);
      fetchStudents(search);
    } catch (err) {
      console.error('Failed to delete student:', err);
    }
  };

  const isAdding = !editingStudent;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Student Management</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage student records and accounts
          </p>
        </div>
        <Button onClick={openAddDialog} className="gap-2 shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4" />
          Add Student
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, student ID, or roll number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : students.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Roll Number</TableHead>
                  <TableHead className="hidden md:table-cell">Department</TableHead>
                  <TableHead className="hidden lg:table-cell">Semester</TableHead>
                  <TableHead>Face Data</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student, idx) => (
                  <TableRow key={student.id} className="animate-fade-in" style={{ animationDelay: `${idx * 30}ms` }}>
                    <TableCell className="font-mono text-sm font-medium">{student.student_id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserCircle className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium">{student.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{student.roll_number}</TableCell>
                    <TableCell className="hidden md:table-cell">{student.department}</TableCell>
                    <TableCell className="hidden lg:table-cell">{student.semester}</TableCell>
                    <TableCell>
                      {student.has_face_data ? (
                        <Badge variant="success" className="gap-1">
                          <Camera className="w-3 h-3" />
                          Registered
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Not Registered
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(student)}
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          aria-label={`Edit ${student.name}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setDeletingStudent(student); setDeleteDialogOpen(true); }}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          aria-label={`Delete ${student.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-16">
              <UserCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground">No students found</p>
              <Button variant="outline" className="mt-4" onClick={openAddDialog}>
                Add First Student
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingStudent ? 'Edit Student' : 'Add New Student'}
            </DialogTitle>
            <DialogDescription>
              {editingStudent
                ? 'Update student information. Leave password blank to keep the current one.'
                : 'Fill in the details below. The student ID has been generated automatically.'}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div role="alert" className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Student ID — auto-generated when adding */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="student-id">Student ID</Label>
                {isAdding && (
                  <div className="flex items-center gap-1.5">
                    {idLocked ? (
                      <Badge variant="secondary" className="text-[10px] gap-1 py-0">
                        Auto-generated
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] gap-1 py-0 text-amber-500 border-amber-500/40">
                        Manual override
                      </Badge>
                    )}
                    <button
                      type="button"
                      onClick={() => setIdLocked(l => !l)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={idLocked ? 'Override student ID manually' : 'Lock student ID'}
                      title={idLocked ? 'Click to enter a custom ID' : 'Click to lock'}
                    >
                      {idLocked
                        ? <Lock className="w-3.5 h-3.5" />
                        : <Unlock className="w-3.5 h-3.5 text-amber-500" />
                      }
                    </button>
                    <button
                      type="button"
                      onClick={regenerateId}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      aria-label="Regenerate student ID"
                      title="Regenerate"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <Input
                id="student-id"
                value={formData.student_id}
                onChange={(e) => setFormData({ ...formData, student_id: e.target.value.toUpperCase() })}
                disabled={editingStudent ? true : idLocked}
                className={`font-mono ${isAdding && idLocked ? 'bg-muted/40 text-muted-foreground' : ''}`}
                placeholder="e.g., STU0001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full-name">Full Name</Label>
              <Input
                id="full-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., John Doe"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="roll-number">Roll Number</Label>
                <Input
                  id="roll-number"
                  value={formData.roll_number}
                  onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                  placeholder="e.g., 101"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="semester">Semester</Label>
                <Input
                  id="semester"
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  placeholder="e.g., 5th"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g., Computer Science"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                {editingStudent ? 'New Password (optional)' : 'Password'}
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete={editingStudent ? 'new-password' : 'new-password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingStudent ? 'Leave blank to keep current' : 'At least 8 characters'}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editingStudent ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingStudent?.name}</strong>?
              This will permanently remove their face data and attendance records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
