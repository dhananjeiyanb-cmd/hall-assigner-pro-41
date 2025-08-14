import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, BookOpen, Plus, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Exam {
  id: string;
  subject: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number | null;
  years: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

const ExamManagement = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [formData, setFormData] = useState({
    subject: '',
    exam_date: '',
    start_time: '',
    duration_hours: 3,
    years: [] as string[]
  });
  const { toast } = useToast();

  const yearOptions = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    const { data } = await supabase
      .from('exams')
      .select('*')
      .order('exam_date', { ascending: true });
    
    if (data) setExams(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject || !formData.exam_date || !formData.start_time || formData.years.length === 0) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields and select at least one year.",
        variant: "destructive"
      });
      return;
    }

    const startTime = new Date(`${formData.exam_date}T${formData.start_time}`);
    const endTime = new Date(startTime.getTime() + (formData.duration_hours * 60 * 60 * 1000));
    
    const examData = {
      subject: formData.subject,
      exam_date: formData.exam_date,
      start_time: formData.start_time,
      end_time: endTime.toTimeString().slice(0, 5),
      duration_hours: formData.duration_hours,
      years: formData.years,
      status: 'scheduled'
    };

    try {
      if (editingExam) {
        const { error } = await supabase
          .from('exams')
          .update(examData)
          .eq('id', editingExam.id);
        
        if (error) throw error;
        
        toast({
          title: "Exam Updated",
          description: "Exam has been updated successfully."
        });
      } else {
        const { error } = await supabase
          .from('exams')
          .insert([examData]);
        
        if (error) throw error;
        
        toast({
          title: "Exam Created",
          description: "New exam has been scheduled successfully."
        });
      }

      resetForm();
      setIsDialogOpen(false);
      fetchExams();
    } catch (error) {
      console.error('Error saving exam:', error);
      toast({
        title: "Error",
        description: "Failed to save exam. Please try again.",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      subject: '',
      exam_date: '',
      start_time: '',
      duration_hours: 3,
      years: []
    });
    setEditingExam(null);
  };

  const handleEdit = (exam: Exam) => {
    setEditingExam(exam);
    setFormData({
      subject: exam.subject,
      exam_date: exam.exam_date,
      start_time: exam.start_time,
      duration_hours: exam.duration_hours || 3,
      years: exam.years
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (examId: string) => {
    if (!confirm('Are you sure you want to delete this exam?')) return;

    try {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', examId);
      
      if (error) throw error;
      
      toast({
        title: "Exam Deleted",
        description: "Exam has been deleted successfully."
      });
      
      fetchExams();
    } catch (error) {
      console.error('Error deleting exam:', error);
      toast({
        title: "Error",
        description: "Failed to delete exam. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'scheduled': return 'default';
      case 'ongoing': return 'secondary';
      case 'completed': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Exam Management</h2>
          <p className="text-gray-600">Schedule and manage examinations for different years</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Schedule New Exam</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingExam ? 'Edit Exam' : 'Schedule New Exam'}
              </DialogTitle>
              <DialogDescription>
                Fill in the exam details and schedule it for students.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  placeholder="e.g., Mathematics, Physics, Internal-1, Model Exam"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="exam_date">Date *</Label>
                  <Input
                    id="exam_date"
                    type="date"
                    value={formData.exam_date}
                    onChange={(e) => setFormData({...formData, exam_date: e.target.value})}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time *</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (Hours) *</Label>
                <Select 
                  value={formData.duration_hours.toString()} 
                  onValueChange={(value) => setFormData({...formData, duration_hours: parseInt(value)})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Hour</SelectItem>
                    <SelectItem value="2">2 Hours</SelectItem>
                    <SelectItem value="3">3 Hours</SelectItem>
                    <SelectItem value="4">4 Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Applicable Years *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {yearOptions.map((year) => (
                    <label key={year} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.years.includes(year)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({...formData, years: [...formData.years, year]});
                          } else {
                            setFormData({...formData, years: formData.years.filter(y => y !== year)});
                          }
                        }}
                      />
                      <span className="text-sm">{year}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex space-x-2">
                <Button type="submit" className="flex-1">
                  {editingExam ? 'Update Exam' : 'Schedule Exam'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {exams.map((exam) => (
          <Card key={exam.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-lg">{exam.subject}</h3>
                    <Badge variant={getStatusBadgeVariant(exam.status)}>{exam.status}</Badge>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(exam.exam_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{exam.start_time} - {exam.end_time} ({exam.duration_hours || 3}h)</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Years:</span>
                    {exam.years.map((year) => (
                      <Badge key={year} variant="secondary" className="text-xs">
                        {year}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(exam)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(exam.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {exams.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Exams Scheduled</h3>
              <p className="text-gray-600 mb-4">Start by scheduling your first exam.</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Schedule First Exam
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ExamManagement;