
-- Create students table for managing student data
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  roll_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  year TEXT NOT NULL CHECK (year IN ('II Year', 'III Year', 'IV Year')),
  section TEXT NOT NULL CHECK (section IN ('A', 'B', 'C', 'D')),
  department TEXT NOT NULL,
  email TEXT,
  password TEXT, -- For student login
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create classrooms table for managing examination rooms
CREATE TABLE public.classrooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_number TEXT NOT NULL UNIQUE,
  building TEXT,
  total_benches INTEGER NOT NULL DEFAULT 0,
  benches_per_row INTEGER NOT NULL DEFAULT 0,
  students_per_bench INTEGER NOT NULL DEFAULT 2,
  total_capacity INTEGER GENERATED ALWAYS AS (total_benches * students_per_bench) STORED,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exams table for managing exam schedules
CREATE TABLE public.exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  exam_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_hours DECIMAL(3,1),
  years TEXT[] NOT NULL, -- Array of years participating
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create seating_allocations table for managing exam seat assignments
CREATE TABLE public.seating_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  bench_number INTEGER NOT NULL,
  seat_position INTEGER NOT NULL CHECK (seat_position IN (1, 2)), -- Left or Right seat
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(exam_id, classroom_id, bench_number, seat_position),
  UNIQUE(exam_id, student_id) -- One student per exam
);

-- Create faculty table for admin users
CREATE TABLE public.faculty (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'faculty' CHECK (role IN ('admin', 'faculty')),
  department TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create seating_combinations table to store mixing rules
CREATE TABLE public.seating_combinations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  allowed_years TEXT[] NOT NULL,
  allowed_sections TEXT[] NOT NULL,
  mix_strategy TEXT NOT NULL DEFAULT 'alternate' CHECK (mix_strategy IN ('alternate', 'block', 'random')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seating_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seating_combinations ENABLE ROW LEVEL SECURITY;

-- Create policies for faculty access (they can manage everything)
CREATE POLICY "Faculty can manage students" ON public.students FOR ALL USING (true);
CREATE POLICY "Faculty can manage classrooms" ON public.classrooms FOR ALL USING (true);
CREATE POLICY "Faculty can manage exams" ON public.exams FOR ALL USING (true);
CREATE POLICY "Faculty can manage seating allocations" ON public.seating_allocations FOR ALL USING (true);
CREATE POLICY "Faculty can manage faculty" ON public.faculty FOR ALL USING (true);
CREATE POLICY "Faculty can manage seating combinations" ON public.seating_combinations FOR ALL USING (true);

-- Create policies for student access (they can only view their own data)
CREATE POLICY "Students can view their own data" ON public.students FOR SELECT USING (true);
CREATE POLICY "Students can view their seating allocations" ON public.seating_allocations FOR SELECT USING (true);
CREATE POLICY "Students can view exam details" ON public.exams FOR SELECT USING (true);
CREATE POLICY "Students can view classroom details" ON public.classrooms FOR SELECT USING (true);

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classrooms_updated_at BEFORE UPDATE ON public.classrooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faculty_updated_at BEFORE UPDATE ON public.faculty
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default seating combinations
INSERT INTO public.seating_combinations (name, allowed_years, allowed_sections, mix_strategy, is_default) VALUES
('II & III Year Mix', ARRAY['II Year', 'III Year'], ARRAY['A', 'B', 'C', 'D'], 'alternate', true),
('III & IV Year Mix', ARRAY['III Year', 'IV Year'], ARRAY['A', 'B', 'C', 'D'], 'alternate', false),
('II & IV Year Mix', ARRAY['II Year', 'IV Year'], ARRAY['A', 'B', 'C', 'D'], 'alternate', false),
('All Years Mix', ARRAY['II Year', 'III Year', 'IV Year'], ARRAY['A', 'B', 'C', 'D'], 'random', false);

-- Insert sample data for testing
INSERT INTO public.faculty (name, email, password, role, department) VALUES
('Dr. Admin User', 'admin@college.edu', 'admin123', 'admin', 'Administration'),
('Prof. Faculty User', 'faculty@college.edu', 'faculty123', 'faculty', 'Computer Science');

INSERT INTO public.classrooms (room_number, building, total_benches, benches_per_row, students_per_bench) VALUES
('A-101', 'Academic Block A', 30, 6, 2),
('A-102', 'Academic Block A', 25, 5, 2),
('B-201', 'Academic Block B', 35, 7, 2),
('B-202', 'Academic Block B', 28, 7, 2);
