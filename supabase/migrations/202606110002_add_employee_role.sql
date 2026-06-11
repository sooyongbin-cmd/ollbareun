-- Add role column to employees table with check constraint and default value
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT '경비원';

ALTER TABLE public.employees
DROP CONSTRAINT IF EXISTS employees_role_check;

ALTER TABLE public.employees
ADD CONSTRAINT employees_role_check CHECK (role IN ('경비원', '미화원', '파견'));
