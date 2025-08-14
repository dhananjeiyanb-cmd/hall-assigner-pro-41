
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Building } from "lucide-react";

interface Classroom {
  id: string;
  room_number: string;
  building: string;
  total_benches: number;
  benches_per_row: number;
  students_per_bench: number;
  total_capacity: number;
  is_active: boolean;
}

const ClassroomManagement = () => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [formData, setFormData] = useState({
    room_number: '',
    building: '',
    total_benches: 0,
    benches_per_row: 0,
    students_per_bench: 2,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    try {
      const { data, error } = await supabase
        .from('classrooms')
        .select('*')
        .order('room_number');

      if (error) throw error;
      setClassrooms(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch classrooms",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingClassroom) {
        const { error } = await supabase
          .from('classrooms')
          .update(formData)
          .eq('id', editingClassroom.id);

        if (error) throw error;
        toast({ title: "Success", description: "Classroom updated successfully" });
      } else {
        const { error } = await supabase
          .from('classrooms')
          .insert([formData]);

        if (error) throw error;
        toast({ title: "Success", description: "Classroom created successfully" });
      }

      setDialogOpen(false);
      setEditingClassroom(null);
      setFormData({
        room_number: '',
        building: '',
        total_benches: 0,
        benches_per_row: 0,
        students_per_bench: 2,
      });
      fetchClassrooms();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save classroom",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (classroom: Classroom) => {
    setEditingClassroom(classroom);
    setFormData({
      room_number: classroom.room_number,
      building: classroom.building || '',
      total_benches: classroom.total_benches,
      benches_per_row: classroom.benches_per_row,
      students_per_bench: classroom.students_per_bench,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this classroom?')) return;

    try {
      const { error } = await supabase
        .from('classrooms')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Classroom deleted successfully" });
      fetchClassrooms();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete classroom",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('classrooms')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchClassrooms();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update classroom status",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading classrooms...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Classroom Management</h2>
          <p className="text-muted-foreground">Manage examination rooms and their seating arrangements</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Classroom
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingClassroom ? 'Edit Classroom' : 'Add New Classroom'}
              </DialogTitle>
              <DialogDescription>
                Configure the classroom layout and seating capacity
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="room_number">Room Number</Label>
                  <Input
                    id="room_number"
                    value={formData.room_number}
                    onChange={(e) => setFormData({...formData, room_number: e.target.value})}
                    placeholder="A-101"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="building">Building</Label>
                  <Input
                    id="building"
                    value={formData.building}
                    onChange={(e) => setFormData({...formData, building: e.target.value})}
                    placeholder="Academic Block A"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="total_benches">Total Benches</Label>
                  <Input
                    id="total_benches"
                    type="number"
                    min="1"
                    value={formData.total_benches}
                    onChange={(e) => setFormData({...formData, total_benches: parseInt(e.target.value) || 0})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="benches_per_row">Benches per Row</Label>
                  <Input
                    id="benches_per_row"
                    type="number"
                    min="1"
                    value={formData.benches_per_row}
                    onChange={(e) => setFormData({...formData, benches_per_row: parseInt(e.target.value) || 0})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="students_per_bench">Students per Bench</Label>
                  <Input
                    id="students_per_bench"
                    type="number"
                    min="1"
                    max="3"
                    value={formData.students_per_bench}
                    onChange={(e) => setFormData({...formData, students_per_bench: parseInt(e.target.value) || 2})}
                    required
                  />
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Total Capacity: {formData.total_benches * formData.students_per_bench} students
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingClassroom ? 'Update' : 'Create'} Classroom
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Available Classrooms
          </CardTitle>
          <CardDescription>
            Total: {classrooms.length} classrooms, 
            Active: {classrooms.filter(c => c.is_active).length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room Number</TableHead>
                <TableHead>Building</TableHead>
                <TableHead>Benches</TableHead>
                <TableHead>Layout</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classrooms.map((classroom) => (
                <TableRow key={classroom.id}>
                  <TableCell className="font-medium">{classroom.room_number}</TableCell>
                  <TableCell>{classroom.building}</TableCell>
                  <TableCell>{classroom.total_benches}</TableCell>
                  <TableCell>
                    {classroom.benches_per_row} × {Math.ceil(classroom.total_benches / classroom.benches_per_row)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {classroom.total_capacity} students
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={classroom.is_active ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => toggleActive(classroom.id, classroom.is_active)}
                    >
                      {classroom.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(classroom)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(classroom.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClassroomManagement;
