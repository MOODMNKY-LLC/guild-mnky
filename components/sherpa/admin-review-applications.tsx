'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  getSherpaApplicationsForAdmin,
  updateSherpaApplicationStatus,
  type SherpaApplicationWithProfile,
} from '@/app/(site)/sherpa/actions'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function AdminReviewApplications() {
  const router = useRouter()
  const [applications, setApplications] = useState<SherpaApplicationWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApplication, setSelectedApplication] = useState<SherpaApplicationWithProfile | null>(null)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewReason, setReviewReason] = useState('')
  const [pendingAction, setPendingAction] = useState<'approve' | 'reject' | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadApplications()
  }, [])

  async function loadApplications() {
    try {
      setLoading(true)
      const result = await getSherpaApplicationsForAdmin()
      if (result.success) {
        setApplications(result.applications)
      }
    } catch (error: any) {
      toast.error(`Failed to load applications: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  function openReviewDialog(application: SherpaApplicationWithProfile, action: 'approve' | 'reject') {
    setSelectedApplication(application)
    setPendingAction(action)
    setReviewReason('')
    setReviewDialogOpen(true)
  }

  async function submitReview() {
    if (!selectedApplication || !pendingAction) return

    try {
      setSubmitting(true)
      await updateSherpaApplicationStatus({
        applicationId: selectedApplication.id,
        status: pendingAction === 'approve' ? 'approved' : 'rejected',
        reviewReason: reviewReason || undefined,
      })

      toast.success(`Application ${pendingAction === 'approve' ? 'approved' : 'rejected'} successfully`)
      setReviewDialogOpen(false)
      setSelectedApplication(null)
      setPendingAction(null)
      setReviewReason('')
      await loadApplications()
      router.refresh()
    } catch (error: any) {
      toast.error(`Failed to ${pendingAction} application: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>
      case 'approved':
        return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle2 className="h-3 w-3" />Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>
      case 'suspended':
        return <Badge variant="destructive" className="gap-1">Suspended</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading applications...</span>
      </div>
    )
  }

  const pendingApplications = applications.filter(app => app.status === 'pending')
  const reviewedApplications = applications.filter(app => app.status !== 'pending')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Sherpa Applications Review</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review and manage Sherpa applications. Approve qualified candidates or reject with feedback.
        </p>
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No applications found.</p>
        </div>
      ) : (
        <>
          {pendingApplications.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Pending Review ({pendingApplications.length})</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Applicant</TableHead>
                      <TableHead>Experience</TableHead>
                      <TableHead>Activities</TableHead>
                      <TableHead>Application</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingApplications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={app.profiles?.avatar_url || undefined} />
                              <AvatarFallback>
                                {app.profiles?.username?.[0]?.toUpperCase() || app.profiles?.full_name?.[0]?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {app.profiles?.username || app.profiles?.full_name || 'Unknown User'}
                              </div>
                              {app.profiles?.full_name && app.profiles?.username && (
                                <div className="text-xs text-muted-foreground">{app.profiles.full_name}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <div className="text-sm truncate" title={app.experience_level || 'Not specified'}>
                            {app.experience_level || 'Not specified'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {app.preferred_activities && app.preferred_activities.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {app.preferred_activities.slice(0, 2).map((activity, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {activity}
                                </Badge>
                              ))}
                              {app.preferred_activities.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{app.preferred_activities.length - 2}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">None specified</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <div className="text-sm line-clamp-2" title={app.application_text}>
                            {app.application_text}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(app.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => openReviewDialog(app, 'approve')}
                              className="gap-1"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openReviewDialog(app, 'reject')}
                              className="gap-1"
                            >
                              <XCircle className="h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {reviewedApplications.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Reviewed ({reviewedApplications.length})</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Applicant</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reviewed By</TableHead>
                      <TableHead>Reviewed At</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviewedApplications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={app.profiles?.avatar_url || undefined} />
                              <AvatarFallback>
                                {app.profiles?.username?.[0]?.toUpperCase() || app.profiles?.full_name?.[0]?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {app.profiles?.username || app.profiles?.full_name || 'Unknown User'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(app.status)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {app.reviewed_by ? 'Admin' : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {app.reviewed_at ? formatDate(app.reviewed_at) : '—'}
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <div className="text-sm text-muted-foreground line-clamp-2" title={app.rejection_reason || undefined}>
                            {app.rejection_reason || '—'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {pendingAction === 'approve' ? 'Approve' : 'Reject'} Application
            </DialogTitle>
            <DialogDescription>
              {pendingAction === 'approve'
                ? 'Approve this Sherpa application. The applicant will be able to create sessions.'
                : 'Reject this application. Provide a reason for the rejection (optional but recommended).'}
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Applicant</Label>
                  <div className="font-medium">
                    {selectedApplication.profiles?.username || selectedApplication.profiles?.full_name || 'Unknown User'}
                  </div>
                </div>
                {selectedApplication.experience_level && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Experience</Label>
                    <div className="text-sm">{selectedApplication.experience_level}</div>
                  </div>
                )}
                {selectedApplication.preferred_activities && selectedApplication.preferred_activities.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Preferred Activities</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedApplication.preferred_activities.map((activity, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {activity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-muted-foreground">Application Text</Label>
                  <div className="text-sm mt-1 whitespace-pre-wrap">{selectedApplication.application_text}</div>
                </div>
                {selectedApplication.bungie_profile_url && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Bungie Profile</Label>
                    <a
                      href={selectedApplication.bungie_profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      View Profile
                    </a>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="review-reason">
                  {pendingAction === 'approve' ? 'Approval Notes (Optional)' : 'Rejection Reason (Recommended)'}
                </Label>
                <Textarea
                  id="review-reason"
                  placeholder={
                    pendingAction === 'approve'
                      ? 'Add any notes about this approval...'
                      : 'Explain why this application is being rejected...'
                  }
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReviewDialogOpen(false)
                setSelectedApplication(null)
                setPendingAction(null)
                setReviewReason('')
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={submitReview}
              disabled={submitting}
              variant={pendingAction === 'approve' ? 'default' : 'destructive'}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  {pendingAction === 'approve' ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Approve
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
