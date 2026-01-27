-- Add Bungie verification status to sherpa_applications
-- This column tracks if an applicant has linked their Bungie account via Discord Linked Roles
-- Phase 3: Discord Linked Roles Implementation

ALTER TABLE public.sherpa_applications
ADD COLUMN IF NOT EXISTS bungie_verified boolean NOT NULL DEFAULT false;

-- Add index for filtering verified applications
CREATE INDEX IF NOT EXISTS idx_sherpa_applications_bungie_verified 
ON public.sherpa_applications(bungie_verified) 
WHERE bungie_verified = true;

-- Add comment
COMMENT ON COLUMN public.sherpa_applications.bungie_verified IS 
'Indicates if applicant has linked Bungie account via Discord Linked Roles. Used for Phase 3 verification requirement.';
