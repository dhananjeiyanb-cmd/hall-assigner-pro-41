
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Users, Building, BookOpen, TrendingUp } from "lucide-react";

interface DashboardProps {
  userType: 'faculty' | 'student';
  userData: any;
}

interface Exam {
  id: string;
  subject: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  years: string[];
  status: string;
}

interface DashboardStats {
  totalStudents: number;
  totalClassrooms: number;
  upcomingExams: number;
  activeAllocations: number;
}

const Dashboard = ({ userType, userData }: DashboardProps) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalClassrooms: 0,
    upcomingExams: 0,
    activeAllocations: 0,
  });
  const [upcomingExams, setUpcomingExams] = useState<Exam[]>([]);
  const [studentSeating, setStudentSeating] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (userType === 'faculty') {
      fetchFacultyDashboard();
    } else {
      fetchStudentDashboard();
    }
  }, [userType, userData]);

  const fetchFacultyDashboard = async () => {
    try {
      // Fetch stats
      const [studentsRes, classroomsRes, examsRes] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact' }),
        supabase.from('classrooms').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('exams').select('id', { count: 'exact' }).gte('exam_date', new Date().toISOString().split('T')[0])
      ]);

      setStats({
        totalStudents: studentsRes.count || 0,
        totalClassrooms: classroomsRes.count || 0,
        upcomingExams: examsRes.count || 0,
        activeAllocations: 0, // Will be calculated from seating_allocations
      });

      // Fetch upcoming exams
      const { data: exams, error: examsError } = await supabase
        .from('exams')
        .select('*')
        .gte('exam_date', new Date().toISOString().split('T')[0])
        .order('exam_date', { ascending: true })
        .limit(5);

      if (examsError) throw examsError;
      setUpcomingExams(exams || []);

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentDashboard = async () => {
    try {
      // Fetch student's seating allocations
      const { data: allocations, error } = await supabase
        .from('seating_allocations')
        .select(`
          *,
          exams (subject, exam_date, start_time, end_time),
          classrooms (room_number, building)
        `)
        .eq('student_id', userData.id)
        .order('exams.exam_date', { ascending: true });

      if (error) throw error;
      setStudentSeating(allocations || []);

      // Fetch upcoming exams for this student's year
      const { data: exams, error: examsError } = await supabase
        .from('exams')
        .select('*')
        .contains('years', [userData.year])
        .gte('exam_date', new Date().toISOString().split('T')[0])
        .order('exam_date', { ascending: true })
        .limit(5);

      if (examsError) throw examsError;
      setUpcomingExams(exams || []);

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch your dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {userData.name}!
        </h1>
        <p className="text-muted-foreground">
          {userType === 'faculty' 
            ? `${userData.role} - ${userData.department}` 
            : `${userData.year} ${userData.section} - ${userData.department}`
          }
        </p>
      </div>

      {userType === 'faculty' ? (
        // Faculty Dashboard
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalStudents}</div>
                <p className="text-xs text-muted-foreground">Registered in system</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Classrooms</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalClassrooms}</div>
                <p className="text-xs text-muted-foreground">Available for exams</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Exams</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.upcomingExams}</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Allocations</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeAllocations}</div>
                <p className="text-xs text-muted-foreground">Seating arranged</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Examinations</CardTitle>
              <CardDescription>Next 5 scheduled exams</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Years</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingExams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">{exam.subject}</TableCell>
                      <TableCell>{formatDate(exam.exam_date)}</TableCell>
                      <TableCell>{formatTime(exam.start_time)} - {formatTime(exam.end_time)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {exam.years.map((year) => (
                            <Badge key={year} variant="secondary" className="text-xs">
                              {year}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={exam.status === 'scheduled' ? "default" : "secondary"}>
                          {exam.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        // Student Dashboard
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Your Details</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">{userData.roll_number}</div>
                <p className="text-xs text-muted-foreground">{userData.year} {userData.section}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Exams</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{upcomingExams.length}</div>
                <p className="text-xs text-muted-foreground">For your year</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Seat Allocations</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{studentSeating.length}</div>
                <p className="text-xs text-muted-foreground">Assigned seats</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Your Upcoming Exams</CardTitle>
              <CardDescription>Exam schedule for {userData.year} {userData.section}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingExams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">{exam.subject}</TableCell>
                      <TableCell>{formatDate(exam.exam_date)}</TableCell>
                      <TableCell>{formatTime(exam.start_time)} - {formatTime(exam.end_time)}</TableCell>
                      <TableCell>
                        <Badge variant={exam.status === 'scheduled' ? "default" : "secondary"}>
                          {exam.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {studentSeating.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Your Seating Arrangements</CardTitle>
                <CardDescription>Assigned seats for upcoming exams</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Classroom</TableHead>
                      <TableHead>Bench</TableHead>
                      <TableHead>Position</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentSeating.map((allocation) => (
                      <TableRow key={allocation.id}>
                        <TableCell className="font-medium">{allocation.exams?.subject}</TableCell>
                        <TableCell>{formatDate(allocation.exams?.exam_date)}</TableCell>
                        <TableCell>
                          {allocation.classrooms?.room_number}
                          {allocation.classrooms?.building && (
                            <div className="text-xs text-muted-foreground">
                              {allocation.classrooms.building}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>#{allocation.bench_number}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {allocation.seat_position === 1 ? 'Left' : 'Right'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
