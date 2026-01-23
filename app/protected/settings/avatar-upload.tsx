'use client'

import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/dropzone'
import { useSupabaseUpload } from '@/hooks/use-supabase-upload'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle, Loader2 } from 'lucide-react'

export function AvatarUpload() {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  
  const upload = useSupabaseUpload({
    bucketName: 'avatars',
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 1,
    path: 'user-avatars',
    upsert: true,
  })

  // Auto-upload when files are selected
  useEffect(() => {
    if (upload.files.length > 0 && !upload.loading && !upload.isSuccess) {
      upload.onUpload()
    }
  }, [upload.files.length, upload.loading, upload.isSuccess, upload.onUpload])

  const handleSaveAvatar = async () => {
    if (upload.files.length === 0 || !upload.isSuccess) return

    setIsUpdating(true)
    const supabase = createClient()
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('You must be logged in to update your avatar')
        return
      }

      // Get the uploaded file URL
      const uploadedFile = upload.files[0]
      const fileName = uploadedFile.name
      
      // Get public URL from storage
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(`user-avatars/${fileName}`)

      if (!urlData?.publicUrl) {
        alert('Failed to get avatar URL. Please try again.')
        return
      }

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          avatar_url: urlData.publicUrl,
          updated_at: new Date().toISOString(),
        })

      if (updateError) throw updateError

      alert('Avatar updated successfully!')
      router.refresh()
    } catch (error: any) {
      alert(error.message || 'Failed to update avatar')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-4">
      <Dropzone {...upload}>
        <DropzoneEmptyState />
        <DropzoneContent />
      </Dropzone>

      {upload.isSuccess && upload.files.length > 0 && (
        <div className="space-y-2">
          {upload.files.map((file) => {
            const isUploaded = upload.successes.includes(file.name)
            return (
              <div
                key={file.name}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-card/80 p-3"
              >
                <div className="flex items-center gap-3">
                  {file.preview && (
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                {isUploaded && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
              </div>
            )
          })}
        </div>
      )}

      {upload.errors.length > 0 && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          <p className="text-sm font-medium text-destructive">Upload errors:</p>
          <ul className="mt-1 list-disc list-inside text-xs text-destructive">
            {upload.errors.map((error, index) => (
              <li key={index}>{error.name}: {error.message}</li>
            ))}
          </ul>
        </div>
      )}

      {upload.isSuccess && upload.files.length > 0 && upload.successes.length > 0 && (
        <Button
          onClick={handleSaveAvatar}
          disabled={isUpdating}
          className="w-full"
        >
          {isUpdating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating avatar...
            </>
          ) : (
            'Save avatar to profile'
          )}
        </Button>
      )}
    </div>
  )
}
