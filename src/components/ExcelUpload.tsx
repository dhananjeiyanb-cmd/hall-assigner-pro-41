
import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Student {
  roll_number: string;
  name: string;
  year: string;
  section: string;
  department: string;
  email?: string;
  password: string;
}

const ExcelUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const generatePassword = () => {
    return Math.random().toString(36).slice(-8);
  };

  const parseCSV = (text: string): Student[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const student: any = {};
      
      headers.forEach((header, index) => {
        if (header === 'roll_number' || header === 'roll number') student.roll_number = values[index];
        if (header === 'name') student.name = values[index];
        if (header === 'year') student.year = values[index];
        if (header === 'section') student.section = values[index];
        if (header === 'department') student.department = values[index];
        if (header === 'email') student.email = values[index];
      });
      
      student.password = generatePassword();
      return student as Student;
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    try {
      const text = await file.text();
      const students = parseCSV(text);
      
      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (const student of students) {
        try {
          // Validate required fields
          if (!student.roll_number || !student.name || !student.year || !student.section || !student.department) {
            errors.push(`Row ${students.indexOf(student) + 2}: Missing required fields`);
            failedCount++;
            continue;
          }

          // Validate year format
          if (!['II Year', 'III Year', 'IV Year'].includes(student.year)) {
            errors.push(`Row ${students.indexOf(student) + 2}: Invalid year "${student.year}". Must be "II Year", "III Year", or "IV Year"`);
            failedCount++;
            continue;
          }

          // Validate section
          if (!['A', 'B', 'C', 'D'].includes(student.section)) {
            errors.push(`Row ${students.indexOf(student) + 2}: Invalid section "${student.section}". Must be A, B, C, or D`);
            failedCount++;
            continue;
          }

          const { error } = await supabase
            .from('students')
            .insert([student]);

          if (error) {
            if (error.code === '23505') { // Unique constraint violation
              errors.push(`Row ${students.indexOf(student) + 2}: Roll number "${student.roll_number}" already exists`);
            } else {
              errors.push(`Row ${students.indexOf(student) + 2}: ${error.message}`);
            }
            failedCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          errors.push(`Row ${students.indexOf(student) + 2}: Unexpected error`);
          failedCount++;
        }
      }

      setUploadResult({ success: successCount, failed: failedCount, errors });
      
      if (successCount > 0) {
        toast({
          title: "Upload Complete",
          description: `Successfully uploaded ${successCount} students`,
        });
      }

    } catch (error) {
      toast({
        title: "Upload Error",
        description: "Failed to process the file. Please ensure it's a valid CSV format.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadTemplate = () => {
    const csvContent = "roll_number,name,year,section,department,email\nCS21001,John Doe,II Year,A,Computer Science,john@example.com\nCS21002,Jane Smith,III Year,B,Computer Science,jane@example.com";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'student_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Upload Student Data
        </CardTitle>
        <CardDescription>
          Upload student information via CSV file. Download the template first to ensure proper format.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4">
          <Button variant="outline" onClick={downloadTemplate}>
            Download CSV Template
          </Button>
          <div className="flex items-center gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              disabled={uploading}
              className="max-w-xs"
            />
            <Button disabled={uploading}>
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Uploading..." : "Upload CSV"}
            </Button>
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>CSV Format Requirements:</strong>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>Columns: roll_number, name, year, section, department, email (optional)</li>
              <li>Year must be: "II Year", "III Year", or "IV Year"</li>
              <li>Section must be: A, B, C, or D</li>
              <li>Passwords will be auto-generated for students</li>
            </ul>
          </AlertDescription>
        </Alert>

        {uploadResult && (
          <div className="space-y-4">
            <Alert className={uploadResult.success > 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <strong>Upload Results:</strong>
                <div className="mt-2">
                  <p className="text-green-600">✓ Successfully uploaded: {uploadResult.success} students</p>
                  {uploadResult.failed > 0 && (
                    <p className="text-red-600">✗ Failed: {uploadResult.failed} students</p>
                  )}
                </div>
              </AlertDescription>
            </Alert>

            {uploadResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Errors:</strong>
                  <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {uploadResult.errors.map((error, index) => (
                      <li key={index} className="text-sm">{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExcelUpload;
