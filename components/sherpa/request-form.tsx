'use client'

import { useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createSherpaRequest, type CreateSherpaRequestInput } from '@/app/(site)/sherpa/actions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const requestSchema = z.object({
  activity_type: z.string().min(1, 'Activity type is required'),
  activity_name: z.string().optional(),
  difficulty: z.string().optional(),
  requested_slots: z.number().min(1).max(6),
  preferred_time_window: z.string().optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
})

type RequestFormValues = z.infer<typeof requestSchema>

export function SherpaRequestForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      activity_type: '',
      activity_name: '',
      difficulty: '',
      requested_slots: 1,
      preferred_time_window: '',
      description: '',
    },
  })

  async function onSubmit(values: RequestFormValues) {
    setIsSubmitting(true)
    try {
      const input: CreateSherpaRequestInput = {
        activity_type: values.activity_type,
        activity_name: values.activity_name || undefined,
        difficulty: values.difficulty || undefined,
        requested_slots: values.requested_slots,
        preferred_time_window: values.preferred_time_window || undefined,
        description: values.description || undefined,
      }

      const result = await createSherpaRequest(input)
      
      if (result.success) {
        toast.success('Request created successfully!', {
          description: 'Sherpas will be notified of your request.',
        })
        router.push('/sherpa/requests')
        router.refresh()
      }
    } catch (error: any) {
      toast.error('Failed to create request', {
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

        <div className="grid grid-cols-2 gap-4">
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

          <FormField
            control={form.control}
            name="requested_slots"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Players Needed *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    max="6"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="preferred_time_window"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preferred Time</FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                When would you like to play? (optional)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Details</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any additional information about what you need help with..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Optional details about your request
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Request'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
