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
import { createSherpaApplication, type CreateSherpaApplicationInput } from '@/app/(site)/sherpa/actions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const applicationSchema = z.object({
  application_text: z.string().min(50, 'Please provide at least 50 characters explaining why you want to be a Sherpa.').max(2000, 'Application text must be less than 2000 characters.'),
  experience_level: z.string().optional(),
  preferred_activities: z.string().optional(),
  bungie_profile_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
})

type ApplicationFormValues = z.infer<typeof applicationSchema>

export function SherpaApplicationForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      application_text: '',
      experience_level: '',
      preferred_activities: '',
      bungie_profile_url: '',
    },
  })

  async function onSubmit(values: ApplicationFormValues) {
    setIsSubmitting(true)
    try {
      const input: CreateSherpaApplicationInput = {
        application_text: values.application_text,
        experience_level: values.experience_level || undefined,
        preferred_activities: values.preferred_activities
          ? values.preferred_activities.split(',').map(s => s.trim()).filter(Boolean)
          : undefined,
        bungie_profile_url: values.bungie_profile_url || undefined,
      }

      const result = await createSherpaApplication(input)
      
      if (result.success) {
        toast.success('Application submitted successfully!', {
          description: 'An admin will review your application soon.',
        })
        router.push('/sherpa')
        router.refresh()
      }
    } catch (error: any) {
      toast.error('Failed to submit application', {
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
          name="application_text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Why do you want to be a Sherpa?</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us about your teaching philosophy, experience helping others, and what makes you a good Sherpa..."
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Minimum 50 characters. Be specific about your experience and approach to teaching.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="experience_level"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Experience Level</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your experience level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="experienced">Experienced (100+ hours, multiple clears)</SelectItem>
                  <SelectItem value="veteran">Veteran (500+ hours, expert knowledge)</SelectItem>
                  <SelectItem value="expert">Expert (1000+ hours, teaching experience)</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Select the level that best describes your Destiny 2 experience.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="preferred_activities"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preferred Activities</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Raids, Dungeons, Nightfalls, PvP"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Comma-separated list of activities you're comfortable teaching.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bungie_profile_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bungie Profile URL (Optional)</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://www.bungie.net/7/en/User/Profile/..."
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Link to your Bungie.net profile to showcase your stats.
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
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
