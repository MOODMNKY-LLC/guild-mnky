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
import { createLfgPost, type CreateLfgPostInput } from '@/app/(site)/lfg/actions'
import { toast } from 'sonner'

interface LfgCreateFormProps {
  children?: React.ReactNode
}

export function LfgCreateForm({ children }: LfgCreateFormProps) {
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
      
      const input: CreateLfgPostInput = {
        title: formData.get('title') as string,
        description: formData.get('description') as string || undefined,
        starts_at: formData.get('starts_at') as string || undefined,
        slots_total: parseInt(formData.get('slots_total') as string) || 6,
      }

      if (!input.title) {
        throw new Error('Title is required')
      }

      if (input.slots_total < 1 || input.slots_total > 12) {
        throw new Error('Slots must be between 1 and 12')
      }

      const result = await createLfgPost(input)
      
      if (result.success) {
        toast.success('LFG post created successfully!')
        setOpen(false)
        router.refresh()
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create LFG post'
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || <Button size="lg">Post an LFG</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create LFG Post</DialogTitle>
          <DialogDescription>
            Looking for a group? Create an LFG post and let others join you.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g., Vault of Glass - Need 2 more"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="What activity are you doing? What roles do you need?"
              rows={4}
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="starts_at">Start Time (optional)</Label>
              <Input
                id="starts_at"
                name="starts_at"
                type="datetime-local"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slots_total">Total Slots *</Label>
              <Input
                id="slots_total"
                name="slots_total"
                type="number"
                min="1"
                max="12"
                defaultValue="6"
                required
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
              {isLoading ? 'Creating...' : 'Create LFG Post'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
