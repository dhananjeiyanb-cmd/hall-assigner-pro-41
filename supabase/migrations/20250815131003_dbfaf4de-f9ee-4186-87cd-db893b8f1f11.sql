-- Add exam_type column to exams table
ALTER TABLE public.exams 
ADD COLUMN exam_type TEXT;