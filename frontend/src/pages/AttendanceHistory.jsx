import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { attendanceAPI, reportsAPI } from '@/services/api';
import {
  Search, FileSpreadsheet, FileText,
  ChevronLeft, ChevronRight, ClipboardList, Calendar
} from 'lucide-react';

export default function AttendanceHistory() {
  const { isAdmin } = useAuth();
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    student_id: '',
    start_date: '',
    end_date: '',
    month: '',
  });

  useEffect(() => {
    fetchAttendance();
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
      };

      if (filters.student_id) params.student_id = filters.student_id;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      if (filters.month) params.month = filters.month;

      const response = await attendanceAPI.list(params);
      setRecords(response.data.records || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchAttendance();
  };

  const handleExport = async (format) => {
    try {
      const params = {};
      if (filters.student_id) params.student_id = filters.student_id;
      if (filters.month) params.month = filters.month;

      const response = format === 'excel'
        ? await reportsAPI.exportExcel(params)
        : await reportsAPI.exportCSV(params);

      // Download file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_report.${format === 'excel' ? 'xlsx' : 'csv'}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isAdmin ? 'Attendance History' : 'My Attendance'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAdmin ? 'View and export attendance records' : 'View your attendance records'}
          </p>
        </div>

        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport('excel')} className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('csv')} className="gap-2">
              <FileText className="w-4 h-4" />
              CSV
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      {isAdmin && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Filter by Student ID..."
                  value={filters.student_id}
                  onChange={(e) => setFilters({ ...filters, student_id: e.target.value })}
                />
              </div>
              <div>
                <Input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                  placeholder="Start Date"
                />
              </div>
              <div>
                <Input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                  placeholder="End Date"
                />
              </div>
              <div>
                <Input
                  type="month"
                  value={filters.month}
                  onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                />
              </div>
              <Button onClick={handleSearch} className="gap-2">
                <Search className="w-4 h-4" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Records Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : records.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    {isAdmin && <TableHead>Student ID</TableHead>}
                    {isAdmin && <TableHead>Name</TableHead>}
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record, idx) => (
                    <TableRow key={record.id || idx} className="animate-fade-in" style={{ animationDelay: `${idx * 20}ms` }}>
                      {isAdmin && <TableCell className="font-mono text-sm">{record.student_id}</TableCell>}
                      {isAdmin && <TableCell className="font-medium">{record.student_name}</TableCell>}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          {record.attendance_date}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{record.attendance_time}</TableCell>
                      <TableCell>
                        <Badge variant="success">Present</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between p-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm px-2">
                    Page {page} of {totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="h-8 w-8"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground">No attendance records found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
