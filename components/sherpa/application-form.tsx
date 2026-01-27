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
import { BungieVerificationCheck } from './bungie-verification-check'
import { createClient } from '@/lib/supabase/client'

const applicationSchema = z.object({
  motivation: z.string().min(50, 'Please provide at least 50 characters explaining why you want to be a Sherpa.').max(2000, 'Application text must be less than 2000 characters.'),
  experience_level: z.string().min(1, 'Please select your experience level.'),
  specialties: z.string().min(1, 'Please list your preferred activities.'),
  availability: z.string().min(1, 'Please provide your availability.'),
  discord_username: z.string().min(1, 'Please provide your Discord username.'),
})

type ApplicationFormValues = z.infer<typeof applicationSchema>

export function SherpaApplicationForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [discordUsername, setDiscordUsername] = useState<string>('')
  const supabase = createClient()

  // Fetch user's Discord username from profile
  useEffect(() => {
    async function fetchDiscordUsername() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', user.id)
        .single()

      if (profile?.display_name) {
        setDiscordUsername(profile.display_name)
        form.setValue('discord_username', profile.display_name)
      } else if (profile?.username) {
        setDiscordUsername(profile.username)
        form.setValue('discord_username', profile.username)
      }
    }

    fetchDiscordUsername()
  }, [supabase])

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      motivation: '',
      experience_level: '',
      specialties: '',
      availability: '',
      discord_username: '',
    },
  })

  async function onSubmit(values: ApplicationFormValues) {
    setIsSubmitting(true)
    try {
      const input: CreateSherpaApplicationInput = {
        motivation: values.motivation,
        experience_level: values.experience_level,
        specialties: values.specialties,
        availability: values.availability,
        discord_username: values.discord_username,
      }

      const result = await createSherpaApplication(input)
      
      if (result.success) {
        toast.success('Application submitted successfully!', {
          description: 'An admin will review your application soon.',
        })
        router.push('/sherpa')
        router.refresh()
      } else {
        toast.error('Failed to submit application', {
          description: result.error ?? 'Please try again later.',
        })
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
    <>
      <BungieVerificationCheck required={true} />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="motivation"
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
            name="specialties"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Specialties / Preferred Activities</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Raids, Dungeons, Nightfalls, PvP"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  List the activities you're comfortable teaching (comma-separated or single list).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="availability"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Availability</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Weekends 2-8 PM EST, Weekdays after 6 PM"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  When are you typically available to run Sherpa sessions?
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="discord_username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discord Username</FormLabel>
                <FormControl>
                  <Input
                    placeholder="YourDiscordName#1234"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Your Discord username (including discriminator if applicable).
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
    </>
  )
}
