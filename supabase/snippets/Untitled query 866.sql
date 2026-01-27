-- Add RLS policies for admin/officer review of Sherpa applications
-- This allows admins and officers to update application status for review purposes

-- Create helper function to check if user is admin or officer
CREATE OR REPLACE FUNCTION public.is_current_user_admin_or_officer()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
  user_role public.user_role;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN user_role = 'admin' OR user_role = 'officer';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_current_user_admin_or_officer() TO authenticated;

-- Add RLS policy for admins/officers to read all applications
DROP POLICY IF EXISTS "Admins and officers can read all sherpa applications" ON public.sherpa_applications;

CREATE POLICY "Admins and officers can read all sherpa applications"
ON public.sherpa_applications FOR SELECT
TO authenticated
USING (public.is_current_user_admin_or_officer());

-- Add RLS policy for admins/officers to update any application
DROP POLICY IF EXISTS "Admins and officers can update any sherpa application" ON public.sherpa_applications;

CREATE POLICY "Admins and officers can update any sherpa application"
ON public.sherpa_applications FOR UPDATE
TO authenticated
USING (public.is_current_user_admin_or_officer())
WITH CHECK (public.is_current_user_admin_or_officer());

-- Add comment
COMMENT ON FUNCTION public.is_current_user_admin_or_officer() IS 'Checks if current user has admin or officer role. Used in RLS policies to allow admin operations.';
