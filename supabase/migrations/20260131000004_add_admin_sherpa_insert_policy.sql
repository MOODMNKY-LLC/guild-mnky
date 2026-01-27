-- Add RLS policy for admins/officers to create Sherpa records
-- This allows admins to create sherpa profiles when approving applications

-- Add RLS policy for admins/officers to insert sherpa records
DROP POLICY IF EXISTS "Admins and officers can create sherpa records" ON public.sherpas;

CREATE POLICY "Admins and officers can create sherpa records"
ON public.sherpas FOR INSERT
TO authenticated
WITH CHECK (public.is_current_user_admin_or_officer());

-- Add comment
COMMENT ON POLICY "Admins and officers can create sherpa records" ON public.sherpas IS 
'Allows admins and officers to create Sherpa records when approving applications. Required for admin review workflow.';
