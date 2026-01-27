-- Fix Admin/Officer Profile Access for Admin Review Interface
-- Updates RLS policy to include officers and ensure profile data is accessible in JOIN queries

-- Update the admin profile policy to include officers
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Use the existing is_current_user_admin_or_officer() function
CREATE POLICY "Admins and officers can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_current_user_admin_or_officer());

-- Add comment
COMMENT ON POLICY "Admins and officers can view all profiles" ON public.profiles IS 
'Allows admins and officers to view all user profiles for admin panel operations. Required for displaying applicant information in Sherpa review interface.';
