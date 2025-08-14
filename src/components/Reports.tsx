
import { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, Printer, Eye, Users, Building } from "lucide-react";

interface ExamWithAllocations {
  id: string;
  subject: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  years: string[];
  allocation_count: number;
}

interface SeatingReport {
  classroom: {
    id: string;
    room_number: string;
    building: string;
    total_benches: number;
    students_per_bench: number;
  };
  allocations: {
    bench_number: number;
    seat_position: number;
    student: {
      name: string;
      roll_number: string;
      year: string;
      section: string;
      department: string;
    };
  }[];
}

const Reports = () => {
  const [exams, setExams] = useState<ExamWithAllocations[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [selectedClassroom, setSelectedClassroom] = useState<string>('');
  const [seatingReports, setSeatingReports] = useState<SeatingReport[]>([]);
  const [availableClassrooms, setAvailableClassrooms] = useState<{id: string, room_number: string, building: string}[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const fetchExamsWithAllocations = useCallback(async () => {
    const { data, error } = await supabase
      .from('exams')
      .select(`
        id,
        subject,
        exam_date,
        start_time,
        end_time,
        years,
        seating_allocations(count)
      `)
      .order('exam_date', { ascending: false });

    if (error) {
      console.error('Error fetching exams:', error);
      return;
    }

    if (data) {
      const examsWithCounts = data.map(exam => ({
        ...exam,
        allocation_count: exam.seating_allocations?.[0]?.count || 0
      })).filter(exam => exam.allocation_count > 0);
      
      setExams(examsWithCounts);
    }
  }, []);

  const fetchClassroomsForExam = async (examId: string) => {
    const { data } = await supabase
      .from('seating_allocations')
      .select(`
        classroom_id,
        classrooms!inner(
          id,
          room_number,
          building
        )
      `)
      .eq('exam_id', examId);

    if (data) {
      const uniqueClassrooms = data.reduce((acc, item) => {
        const classroom = item.classrooms;
        if (!acc.find(c => c.id === classroom.id)) {
          acc.push(classroom);
        }
        return acc;
      }, [] as typeof availableClassrooms);
      
      setAvailableClassrooms(uniqueClassrooms);
    }
  };

  const generateSeatingChart = async () => {
    if (!selectedExam) {
      toast({
        title: "Select Exam",
        description: "Please select an exam to generate reports for.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      let query = supabase
        .from('seating_allocations')
        .select(`
          bench_number,
          seat_position,
          students!inner(
            name,
            roll_number,
            year,
            section,
            department
          ),
          classrooms!inner(
            id,
            room_number,
            building,
            total_benches,
            students_per_bench
          )
        `)
        .eq('exam_id', selectedExam)
        .order('classrooms(room_number)')
        .order('bench_number')
        .order('seat_position');

      if (selectedClassroom) {
        query = query.eq('classroom_id', selectedClassroom);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        // Group by classroom
        const reportsByClassroom = data.reduce((acc, allocation) => {
          const classroomId = allocation.classrooms.id;
          if (!acc[classroomId]) {
            acc[classroomId] = {
              classroom: allocation.classrooms,
              allocations: []
            };
          }
          
          acc[classroomId].allocations.push({
            bench_number: allocation.bench_number,
            seat_position: allocation.seat_position,
            student: allocation.students
          });
          
          return acc;
        }, {} as Record<string, SeatingReport>);

        setSeatingReports(Object.values(reportsByClassroom));
      }

    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Report Generation Failed",
        description: "Failed to generate seating chart. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const printSeatingChart = () => {
    window.print();
  };

  const downloadAttendanceSheet = (classroomReport: SeatingReport) => {
    const exam = exams.find(e => e.id === selectedExam);
    if (!exam) return;

    const csvContent = [
      ['Roll Number', 'Name', 'Year', 'Section', 'Department', 'Bench', 'Seat', 'Signature'],
      ...classroomReport.allocations.map(allocation => [
        allocation.student.roll_number,
        allocation.student.name,
        allocation.student.year,
        allocation.student.section,
        allocation.student.department,
        allocation.bench_number.toString(),
        allocation.seat_position === 1 ? 'Left' : 'Right',
        ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${exam.subject}_${classroomReport.classroom.room_number}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: `Attendance sheet for ${classroomReport.classroom.room_number} is downloading.`
    });
  };

  useState(() => {
    fetchExamsWithAllocations();
  }, [fetchExamsWithAllocations]);

  const handleExamChange = (examId: string) => {
    setSelectedExam(examId);
    setSelectedClassroom('');
    setSeatingReports([]);
    if (examId) {
      fetchClassroomsForExam(examId);
    }
  };

  const selectedExamDetails = exams.find(e => e.id === selectedExam);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Reports</h2>
          <p className="text-gray-600">Generate seating charts and attendance sheets</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Configuration */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Report Configuration</span>
            </CardTitle>
            <CardDescription>
              Select exam and options for report generation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="exam-select">Select Exam</Label>
              <Select value={selectedExam} onValueChange={handleExamChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an exam" />
                </SelectTrigger>
                <SelectContent>
                  {exams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      <div className="space-y-1">
                        <div>{exam.subject}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(exam.exam_date).toLocaleDateString()} • {exam.allocation_count} students
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {availableClassrooms.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="classroom-select">Filter by Classroom (Optional)</Label>
                <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
                  <SelectTrigger>
                    <SelectValue placeholder="All classrooms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Classrooms</SelectItem>
                    {availableClassrooms.map((classroom) => (
                      <SelectItem key={classroom.id} value={classroom.id}>
                        {classroom.room_number} - {classroom.building}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedExamDetails && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Exam Details</h4>
                <div className="space-y-1 text-sm">
                  <div><span className="text-blue-700">Subject:</span> {selectedExamDetails.subject}</div>
                  <div><span className="text-blue-700">Date:</span> {new Date(selectedExamDetails.exam_date).toLocaleDateString()}</div>
                  <div><span className="text-blue-700">Time:</span> {selectedExamDetails.start_time} - {selectedExamDetails.end_time}</div>
                  <div><span className="text-blue-700">Students:</span> {selectedExamDetails.allocation_count}</div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Button 
                onClick={generateSeatingChart}
                disabled={!selectedExam || isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Eye className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Generate Reports
                  </>
                )}
              </Button>

              {seatingReports.length > 0 && (
                <Button 
                  onClick={printSeatingChart}
                  variant="outline"
                  className="w-full"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Seating Charts
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reports Display */}
        <div className="lg:col-span-2 space-y-6">
          {seatingReports.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select an exam and click "Generate Reports" to view seating arrangements</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            seatingReports.map((report) => (
              <Card key={report.classroom.id} className="print:break-after-page">
                <CardHeader className="print:text-black">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <Building className="h-5 w-5" />
                        <span>{report.classroom.room_number}</span>
                      </CardTitle>
                      <CardDescription>
                        {report.classroom.building} • {report.allocations.length} students allocated
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => downloadAttendanceSheet(report)}
                      variant="outline"
                      size="sm"
                      className="print:hidden"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Attendance CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Seating Layout Visual */}
                  <div className="mb-6">
                    <h4 className="font-medium mb-4 flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Seating Arrangement
                    </h4>
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(6, report.classroom.total_benches)}, 1fr)` }}>
                      {Array.from({ length: report.classroom.total_benches }, (_, benchIndex) => {
                        const benchNumber = benchIndex + 1;
                        const benchAllocations = report.allocations.filter(a => a.bench_number === benchNumber);
                        
                        return (
                          <div key={benchNumber} className="border rounded p-2 bg-gray-50 min-h-[80px]">
                            <div className="text-xs font-medium text-gray-600 mb-1">Bench {benchNumber}</div>
                            <div className="space-y-1">
                              {benchAllocations.map((allocation) => (
                                <div key={`${allocation.bench_number}-${allocation.seat_position}`} className="text-xs bg-white p-1 rounded border">
                                  <div className="font-medium truncate">{allocation.student.name}</div>
                                  <div className="text-gray-500">{allocation.student.roll_number}</div>
                                  <div className="text-gray-500">{allocation.student.year} {allocation.student.section}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Student List */}
                  <div>
                    <h4 className="font-medium mb-4">Student List</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left p-2">Bench</th>
                            <th className="text-left p-2">Seat</th>
                            <th className="text-left p-2">Roll Number</th>
                            <th className="text-left p-2">Name</th>
                            <th className="text-left p-2">Year</th>
                            <th className="text-left p-2">Section</th>
                            <th className="text-left p-2 print:table-cell hidden sm:table-cell">Department</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.allocations
                            .sort((a, b) => a.bench_number - b.bench_number || a.seat_position - b.seat_position)
                            .map((allocation, index) => (
                            <tr key={index} className="border-b hover:bg-gray-50">
                              <td className="p-2">{allocation.bench_number}</td>
                              <td className="p-2">{allocation.seat_position === 1 ? 'Left' : 'Right'}</td>
                              <td className="p-2 font-medium">{allocation.student.roll_number}</td>
                              <td className="p-2">{allocation.student.name}</td>
                              <td className="p-2">
                                <Badge variant="outline" className="text-xs">
                                  {allocation.student.year}
                                </Badge>
                              </td>
                              <td className="p-2">
                                <Badge variant="secondary" className="text-xs">
                                  {allocation.student.section}
                                </Badge>
                              </td>
                              <td className="p-2 hidden sm:table-cell print:table-cell text-gray-600">
                                {allocation.student.department}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
