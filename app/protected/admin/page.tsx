import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminPanelClient } from './admin-panel-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Suspense } from 'react'

/**
 * Admin Panel - Backend Control Panel
 * 
 * This page provides access to Supabase backend management tools:
 * - Database management
 * - Storage management  
 * - Auth configuration
 * - User management
 * - Secrets management
 * - Logs viewing
 * - Suggestions
 * 
 * Access is restricted to officers/admins only.
 */
async function AdminContent() {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/auth/login')
  }

  // Check if user is an officer/admin
  // For now, we'll check user metadata or a profiles table
  // In production, you'd check Discord roles or a profiles.is_officer field
  const { data: profile } = await supabase
    .from('roster_members')
    .select('is_officer, display_name')
    .eq('id', user.id)
    .single()

  // Also check user metadata for admin flag (set during Discord OAuth)
  const isAdmin = user.user_metadata?.is_officer === true || 
                  user.user_metadata?.is_admin === true ||
                  profile?.is_officer === true

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You must be an officer or admin to access the backend control panel.
            If you believe this is an error, please contact a clan officer.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Extract project ref from Supabase URL
  // For local dev, use the project ref from env or extract from URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const projectRef = supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1')
    ? 'local' 
    : supabaseUrl.split('//')[1]?.split('.')[0] || 'local'

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-6 w-6 text-primary" />
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Backend Control Panel
          </p>
        </div>
        <h1 className="font-display text-3xl">Supabase Management</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Manage your database, storage, authentication, and backend services.
          This panel provides direct access to Supabase backend tools.
        </p>
      </header>

      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle className="font-display text-lg">Platform Kit</CardTitle>
          <CardDescription>
            Access all backend management tools in one place
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminPanelClient projectRef={projectRef} />
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle className="font-display text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• <strong>Database:</strong> Browse tables, run queries, manage schema</p>
          <p>• <strong>Storage:</strong> Upload files, manage buckets, set permissions</p>
          <p>• <strong>Auth:</strong> Configure providers, manage users, view sessions</p>
          <p>• <strong>Users:</strong> View user growth, manage profiles</p>
          <p>• <strong>Secrets:</strong> Manage environment variables and API keys</p>
          <p>• <strong>Logs:</strong> View application logs and errors</p>
          <p>• <strong>Suggestions:</strong> Get AI-powered suggestions for optimization</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function AdminPage() {
  return (
    <Suspense fallback={<div className="space-y-6">Loading admin panel...</div>}>
      <AdminContent />
    </Suspense>
  )
}
