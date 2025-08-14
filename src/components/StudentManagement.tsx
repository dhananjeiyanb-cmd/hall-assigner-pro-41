
import { useState } from 'react';
import { Upload, Download, Search, Filter, UserPlus, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const StudentManagement = () => {
  const [students, setStudents] = useState([
    { rollNo: 'CS21001', name: 'Aarav Sharma', year: 'II Year', section: 'A', department: 'Computer Science' },
    { rollNo: 'CS21002', name: 'Diya Patel', year: 'II Year', section: 'A', department: 'Computer Science' },
    { rollNo: 'CS20001', name: 'Arjun Kumar', year: 'III Year', section: 'B', department: 'Computer Science' },
    { rollNo: 'EC21001', name: 'Priya Singh', year: 'II Year', section: 'A', department: 'Electronics' },
    { rollNo: 'ME19001', name: 'Rahul Gupta', year: 'IV Year', section: 'C', department: 'Mechanical' },
    { rollNo: 'CS20002', name: 'Sneha Reddy', year: 'III Year', section: 'B', department: 'Computer Science' },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('Excel file uploaded:', file.name);
      // Here you would process the Excel file
      // For demo purposes, we'll show a success message
      alert('Excel file uploaded successfully! Student data will be processed.');
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.rollNo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = selectedYear === '' || student.year === selectedYear;
    return matchesSearch && matchesYear;
  });

  const yearOptions = ['II Year', 'III Year', 'IV Year'];
  const departmentStats = students.reduce((acc, student) => {
    acc[student.department] = (acc[student.department] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Student Management</h1>
          <p className="text-muted-foreground mt-2">
            Upload and manage student data for exam allocations
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          <label className="btn-primary-gradient cursor-pointer inline-flex items-center">
            <Upload className="h-4 w-4 mr-2" />
            Upload Excel
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="stats-card">
          <div className="stats-number">{students.length}</div>
          <div className="stats-label">Total Students</div>
        </div>
        {Object.entries(departmentStats).map(([dept, count]) => (
          <div key={dept} className="stats-card">
            <div className="stats-number">{count}</div>
            <div className="stats-label">{dept}</div>
          </div>
        ))}
      </div>

      {/* Upload Instructions */}
      <div className="academic-card">
        <div className="academic-card-header">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Excel Upload Format
          </h2>
        </div>
        <div className="academic-card-content">
          <div className="bg-accent/50 p-4 rounded-lg mb-4">
            <p className="text-sm text-muted-foreground mb-2">
              Your Excel file should contain the following columns:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
              <div className="font-medium">Roll Number</div>
              <div className="font-medium">Student Name</div>
              <div className="font-medium">Year (II/III/IV)</div>
              <div className="font-medium">Section (A/B/C/D)</div>
              <div className="font-medium">Department</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            * Make sure the first row contains column headers exactly as shown above
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="academic-card">
        <div className="academic-card-content">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name or roll number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-4">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg bg-background"
              >
                <option value="">All Years</option>
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                More Filters
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="academic-card">
        <div className="academic-card-header">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Student Records ({filteredStudents.length})
            </h2>
            <Button variant="outline" size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Student
            </Button>
          </div>
        </div>
        <div className="academic-card-content p-0">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll Number</th>
                  <th>Student Name</th>
                  <th>Year</th>
                  <th>Section</th>
                  <th>Department</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.rollNo}>
                    <td className="font-mono font-medium">{student.rollNo}</td>
                    <td className="font-medium">{student.name}</td>
                    <td>{student.year}</td>
                    <td className="text-center">{student.section}</td>
                    <td>{student.department}</td>
                    <td>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentManagement;
