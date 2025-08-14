
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Users, Building, CheckCircle, AlertCircle } from "lucide-react";

interface Exam {
  id: string;
  subject: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  years: string[];
  status: string;
}

interface Classroom {
  id: string;
  room_number: string;
  building: string;
  total_benches: number;
  total_capacity: number;
  students_per_bench: number;
}

interface Student {
  id: string;
  name: string;
  roll_number: string;
  year: string;
  section: string;
  department: string;
  created_at: string;
  email: string | null;
  password: string | null;
  updated_at: string;
}

interface SeatingCombination {
  id: string;
  name: string;
  allowed_years: string[];
  allowed_sections: string[];
  mix_strategy: string;
  created_at: string;
}

const SeatAllocation = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [seatingCombinations, setSeatingCombinations] = useState<SeatingCombination[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [selectedCombination, setSelectedCombination] = useState<string>('');
  const [allocatedStudents, setAllocatedStudents] = useState<number>(0);
  const [isAllocating, setIsAllocating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchExams();
    fetchClassrooms();
    fetchSeatingCombinations();
  }, []);

  const fetchExams = async () => {
    const { data } = await supabase
      .from('exams')
      .select('*')
      .eq('status', 'scheduled')
      .order('exam_date', { ascending: true });
    
    if (data) setExams(data);
  };

  const fetchClassrooms = async () => {
    const { data } = await supabase
      .from('classrooms')
      .select('*')
      .eq('is_active', true)
      .order('room_number');
    
    if (data) setClassrooms(data);
  };

  const fetchSeatingCombinations = async () => {
    const { data } = await supabase
      .from('seating_combinations')
      .select('*')
      .order('name');
    
    if (data) setSeatingCombinations(data);
  };

  const generateSeatingAllocation = async () => {
    if (!selectedExam || !selectedCombination) {
      toast({
        title: "Missing Selection",
        description: "Please select both an exam and seating combination.",
        variant: "destructive"
      });
      return;
    }

    setIsAllocating(true);
    
    try {
      // Get exam details
      const exam = exams.find(e => e.id === selectedExam);
      const combination = seatingCombinations.find(c => c.id === selectedCombination);
      
      if (!exam || !combination) return;

      // Fetch eligible students based on exam years and combination rules
      const { data: students } = await supabase
        .from('students')
        .select('*')
        .in('year', exam.years)
        .order('year, section, roll_number');

      if (!students || students.length === 0) {
        toast({
          title: "No Students Found",
          description: "No eligible students found for this exam.",
          variant: "destructive"
        });
        return;
      }

      // Clear existing allocations for this exam
      await supabase
        .from('seating_allocations')
        .delete()
        .eq('exam_id', selectedExam);

      // Generate seating arrangement
      const totalCapacity = classrooms.reduce((sum, room) => sum + room.total_capacity, 0);
      
      if (students.length > totalCapacity) {
        toast({
          title: "Insufficient Capacity",
          description: `Need ${students.length} seats but only ${totalCapacity} available.`,
          variant: "destructive"
        });
        return;
      }

      // Apply mixing strategy
      let mixedStudents = [...students];
      if (combination.mix_strategy === 'alternate') {
        mixedStudents = alternateStudentsByYearSection(students);
      } else if (combination.mix_strategy === 'random') {
        mixedStudents = shuffleArray(students);
      }

      // Allocate students to classrooms and seats
      let studentIndex = 0;
      const allocations = [];

      for (const classroom of classrooms) {
        if (studentIndex >= mixedStudents.length) break;

        for (let bench = 1; bench <= classroom.total_benches; bench++) {
          for (let seat = 1; seat <= classroom.students_per_bench; seat++) {
            if (studentIndex >= mixedStudents.length) break;

            allocations.push({
              exam_id: selectedExam,
              classroom_id: classroom.id,
              student_id: mixedStudents[studentIndex].id,
              bench_number: bench,
              seat_position: seat
            });

            studentIndex++;
          }
        }
      }

      // Insert allocations into database
      const { error } = await supabase
        .from('seating_allocations')
        .insert(allocations);

      if (error) throw error;

      setAllocatedStudents(allocations.length);
      
      toast({
        title: "Allocation Complete",
        description: `Successfully allocated ${allocations.length} students to seats.`
      });

    } catch (error) {
      console.error('Error generating allocation:', error);
      toast({
        title: "Allocation Failed",
        description: "Failed to generate seating allocation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAllocating(false);
    }
  };

  const alternateStudentsByYearSection = (students: Student[]) => {
    const groups = students.reduce((acc, student) => {
      const key = `${student.year}-${student.section}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(student);
      return acc;
    }, {} as Record<string, Student[]>);

    const result = [];
    const groupKeys = Object.keys(groups);
    const maxLength = Math.max(...Object.values(groups).map(g => g.length));

    for (let i = 0; i < maxLength; i++) {
      for (const key of groupKeys) {
        if (groups[key][i]) {
          result.push(groups[key][i]);
        }
      }
    }

    return result;
  };

  const shuffleArray = (array: Student[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const selectedExamDetails = exams.find(e => e.id === selectedExam);
  const totalCapacity = classrooms.reduce((sum, room) => sum + room.total_capacity, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Seat Allocation</h2>
          <p className="text-gray-600">Generate smart seating arrangements for examinations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Allocation Configuration</span>
              </CardTitle>
              <CardDescription>
                Select exam and seating arrangement preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="exam-select">Select Exam</Label>
                <Select value={selectedExam} onValueChange={setSelectedExam}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an exam to allocate seats for" />
                  </SelectTrigger>
                  <SelectContent>
                    {exams.map((exam) => (
                      <SelectItem key={exam.id} value={exam.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{exam.subject}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            {new Date(exam.exam_date).toLocaleDateString()} - {exam.years.join(', ')}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="combination-select">Seating Strategy</Label>
                <Select value={selectedCombination} onValueChange={setSelectedCombination}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose seating arrangement strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    {seatingCombinations.map((combination) => (
                      <SelectItem key={combination.id} value={combination.id}>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span>{combination.name}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {combination.mix_strategy} mixing • Years: {combination.allowed_years.join(', ')}
                            </div>
                          </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedExamDetails && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Exam Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-blue-700">Subject:</span> {selectedExamDetails.subject}
                    </div>
                    <div>
                      <span className="text-blue-700">Date:</span> {new Date(selectedExamDetails.exam_date).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="text-blue-700">Time:</span> {selectedExamDetails.start_time} - {selectedExamDetails.end_time}
                    </div>
                    <div>
                      <span className="text-blue-700">Years:</span> {selectedExamDetails.years.join(', ')}
                    </div>
                  </div>
                </div>
              )}

              <Button 
                onClick={generateSeatingAllocation}
                disabled={!selectedExam || !selectedCombination || isAllocating}
                className="w-full"
                size="lg"
              >
                {isAllocating ? (
                  <>
                    <AlertCircle className="h-4 w-4 mr-2 animate-spin" />
                    Generating Allocation...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Generate Seating Allocation
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Statistics Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5" />
                <span>Capacity Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Available Classrooms</span>
                  <Badge variant="outline">{classrooms.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Capacity</span>
                  <Badge variant="outline">{totalCapacity} seats</Badge>
                </div>
                {allocatedStudents > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Allocated Students</span>
                    <Badge variant="default">{allocatedStudents}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Available Classrooms</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {classrooms.map((classroom) => (
                  <div key={classroom.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium text-sm">{classroom.room_number}</div>
                      <div className="text-xs text-gray-500">{classroom.building}</div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {classroom.total_capacity} seats
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SeatAllocation;
