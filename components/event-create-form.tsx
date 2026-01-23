'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createEvent, type CreateEventInput } from '@/app/(site)/events/actions'
import { toast } from 'sonner'

interface EventCreateFormProps {
  children?: React.ReactNode
}

export function EventCreateForm({ children }: EventCreateFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData(e.currentTarget)
      
      const input: CreateEventInput = {
        title: formData.get('title') as string,
        description: formData.get('description') as string || undefined,
        starts_at: formData.get('starts_at') as string,
        ends_at: formData.get('ends_at') as string || undefined,
        capacity: formData.get('capacity') ? parseInt(formData.get('capacity') as string) : undefined,
        roles: formData.get('roles') ? (formData.get('roles') as string).split(',').map(r => r.trim()).filter(Boolean) : undefined,
      }

      if (!input.title || !input.starts_at) {
        throw new Error('Title and start time are required')
      }

      const result = await createEvent(input)
      
      if (result.success) {
        toast.success('Event created successfully!')
        setOpen(false)
        router.refresh()
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create event'
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || <Button size="lg">Create an event</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            Schedule a new event for your community. Set clear expectations and roles needed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g., Vault of Glass Teaching Run"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="What should participants expect? What's the goal?"
              rows={4}
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="starts_at">Start Time *</Label>
              <Input
                id="starts_at"
                name="starts_at"
                type="datetime-local"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ends_at">End Time</Label>
              <Input
                id="ends_at"
                name="ends_at"
                type="datetime-local"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                name="capacity"
                type="number"
                min="1"
                placeholder="e.g., 6"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="roles">Roles Needed (comma-separated)</Label>
              <Input
                id="roles"
                name="roles"
                placeholder="e.g., Guide, Runner, Support"
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
