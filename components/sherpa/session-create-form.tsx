'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createSherpaSession, type CreateSherpaSessionInput } from '@/app/(site)/sherpa/actions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

const sessionSchema = z.object({
  request_id: z.string().optional(),
  activity_type: z.string().min(1, 'Activity type is required'),
  activity_name: z.string().optional(),
  difficulty: z.string().optional(),
  scheduled_start: z.string().min(1, 'Scheduled start time is required'),
  scheduled_end: z.string().optional(),
  seeker_ids: z.array(z.string()).min(1, 'At least one seeker is required'),
})

type SessionFormValues = z.infer<typeof sessionSchema>

interface SessionCreateFormProps {
  requestId?: string
  onSuccess?: () => void
}

export function SessionCreateForm({ requestId, onSuccess }: SessionCreateFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availableSeekers, setAvailableSeekers] = useState<Array<{ id: string; name: string }>>([])
  const [loadingSeekers, setLoadingSeekers] = useState(false)

  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      request_id: requestId || '',
      activity_type: '',
      activity_name: '',
      difficulty: '',
      scheduled_start: '',
      scheduled_end: '',
      seeker_ids: [],
    },
  })

  useEffect(() => {
    async function loadRequestData() {
      if (!requestId) return

      const supabase = await createClient()
      
      // Load request details
      const { data: request } = await supabase
        .from('sherpa_requests')
        .select('activity_type, activity_name, difficulty, seeker_profile_id, profiles!inner(id, display_name, username)')
        .eq('id', requestId)
        .single()

      if (request) {
        form.setValue('activity_type', request.activity_type)
        form.setValue('activity_name', request.activity_name || '')
        form.setValue('difficulty', request.difficulty || '')
        form.setValue('seeker_ids', [request.seeker_profile_id])
        
        const seekerProfile = (request.profiles as any)
        setAvailableSeekers([{
          id: seekerProfile.id,
          name: seekerProfile.display_name || seekerProfile.username || 'Seeker',
        }])
      }
    }

    loadRequestData()
  }, [requestId, form])

  async function onSubmit(values: SessionFormValues) {
    setIsSubmitting(true)
    try {
      const input: CreateSherpaSessionInput = {
        request_id: values.request_id || undefined,
        activity_type: values.activity_type,
        activity_name: values.activity_name || undefined,
        difficulty: values.difficulty || undefined,
        scheduled_start: values.scheduled_start,
        scheduled_end: values.scheduled_end || undefined,
        seeker_ids: values.seeker_ids,
      }

      const result = await createSherpaSession(input)
      
      if (result.success) {
        toast.success('Session created successfully!', {
          description: 'The session has been scheduled.',
        })
        onSuccess?.()
        router.push('/sherpa/sessions')
        router.refresh()
      }
    } catch (error: any) {
      toast.error('Failed to create session', {
        description: error.message || 'Please try again later.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="activity_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Activity Type *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select activity type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="raid">Raid</SelectItem>
                  <SelectItem value="dungeon">Dungeon</SelectItem>
                  <SelectItem value="nightfall">Nightfall</SelectItem>
                  <SelectItem value="pvp">PvP</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="activity_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Activity Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Vault of Glass, Prophecy, Grandmaster Nightfall"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Specific activity name (optional but recommended)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="difficulty"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Difficulty</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="master">Master</SelectItem>
                  <SelectItem value="grandmaster">Grandmaster</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="scheduled_start"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scheduled Start *</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="scheduled_end"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scheduled End</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="seeker_ids"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Seekers *</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  {field.value.map((seekerId, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={seekerId}
                        onChange={(e) => {
                          const newSeekers = [...field.value]
                          newSeekers[index] = e.target.value
                          field.onChange(newSeekers)
                        }}
                        placeholder="Seeker profile ID"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newSeekers = field.value.filter((_, i) => i !== index)
                          field.onChange(newSeekers)
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      field.onChange([...field.value, ''])
                    }}
                  >
                    Add Seeker
                  </Button>
                </div>
              </FormControl>
              <FormDescription>
                Profile IDs of Seekers participating in this session.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onSuccess?.()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Session'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
