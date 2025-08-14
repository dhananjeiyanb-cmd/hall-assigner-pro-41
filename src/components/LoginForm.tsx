
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User, GraduationCap } from "lucide-react";

interface LoginFormProps {
  onLogin: (userType: 'faculty' | 'student', userData: any) => void;
}

const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [facultyCredentials, setFacultyCredentials] = useState({ email: '', password: '' });
  const [studentCredentials, setStudentCredentials] = useState({ rollNumber: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFacultyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('faculty')
        .select('*')
        .eq('email', facultyCredentials.email)
        .eq('password', facultyCredentials.password)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        toast({
          title: "Login Failed",
          description: "Invalid email or password",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Login Successful",
        description: `Welcome back, ${data.name}!`,
      });
      
      onLogin('faculty', data);
    } catch (error) {
      toast({
        title: "Login Error",
        description: "An error occurred during login",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('roll_number', studentCredentials.rollNumber)
        .eq('password', studentCredentials.password)
        .single();

      if (error || !data) {
        toast({
          title: "Login Failed",
          description: "Invalid roll number or password",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Login Successful",
        description: `Welcome, ${data.name}!`,
      });
      
      onLogin('student', data);
    } catch (error) {
      toast({
        title: "Login Error",
        description: "An error occurred during login",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-blue-900">Exam Hall Management</CardTitle>
          <CardDescription>Please sign in to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="faculty" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="faculty" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Faculty
              </TabsTrigger>
              <TabsTrigger value="student" className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Student
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="faculty">
              <form onSubmit={handleFacultyLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="faculty-email">Email</Label>
                  <Input
                    id="faculty-email"
                    type="email"
                    placeholder="admin@college.edu"
                    value={facultyCredentials.email}
                    onChange={(e) => setFacultyCredentials({...facultyCredentials, email: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="faculty-password">Password</Label>
                  <Input
                    id="faculty-password"
                    type="password"
                    value={facultyCredentials.password}
                    onChange={(e) => setFacultyCredentials({...facultyCredentials, password: e.target.value})}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In as Faculty"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="student">
              <form onSubmit={handleStudentLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="student-roll">Roll Number</Label>
                  <Input
                    id="student-roll"
                    type="text"
                    placeholder="CS21001"
                    value={studentCredentials.rollNumber}
                    onChange={(e) => setStudentCredentials({...studentCredentials, rollNumber: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-password">Password</Label>
                  <Input
                    id="student-password"
                    type="password"
                    value={studentCredentials.password}
                    onChange={(e) => setStudentCredentials({...studentCredentials, password: e.target.value})}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In as Student"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;
