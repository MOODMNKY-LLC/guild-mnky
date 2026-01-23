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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { submitOathkeeperRating, type SubmitOathkeeperRatingInput } from '@/app/(site)/sherpa/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ratingSchema = z.object({
  rated_profile_id: z.string().min(1, 'Please select a participant to rate'),
  helpfulness_rating: z.number().min(1).max(5),
  patience_rating: z.number().min(1).max(5),
  teaching_skill_rating: z.number().min(1).max(5).optional(),
  overall_rating: z.number().min(1).max(5),
  feedback_text: z.string().max(500, 'Feedback must be less than 500 characters').optional(),
})

type RatingFormValues = z.infer<typeof ratingSchema>

interface OathkeeperRatingFormProps {
  sessionId: string
  onSuccess?: () => void
}

export function OathkeeperRatingForm({ sessionId, onSuccess }: OathkeeperRatingFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [participants, setParticipants] = useState<Array<{ id: string; name: string; isSherpa: boolean }>>([])
  const [loadingParticipants, setLoadingParticipants] = useState(true)

  const form = useForm<RatingFormValues>({
    resolver: zodResolver(ratingSchema),
    defaultValues: {
      rated_profile_id: '',
      helpfulness_rating: 5,
      patience_rating: 5,
      teaching_skill_rating: undefined,
      overall_rating: 5,
      feedback_text: '',
    },
  })

  useEffect(() => {
    async function loadParticipants() {
      try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setLoadingParticipants(false)
          return
        }

        // Get session details
        const { data: session, error: sessionError } = await supabase
          .from('sherpa_sessions')
          .select(`
            seeker_ids,
            sherpa_id,
            sherpas!inner(profile_id, profiles!inner(id, display_name, username))
          `)
          .eq('id', sessionId)
          .single()

        if (sessionError || !session) {
          setLoadingParticipants(false)
          return
        }

        const participantList: Array<{ id: string; name: string; isSherpa: boolean }> = []

        // Add Sherpa
        const sherpaProfile = (session.sherpas as any)?.profiles
        if (sherpaProfile && sherpaProfile.id !== user.id) {
          participantList.push({
            id: sherpaProfile.id,
            name: sherpaProfile.display_name || sherpaProfile.username || 'Sherpa',
            isSherpa: true,
          })
        }

        // Add Seekers
        if (session.seeker_ids && Array.isArray(session.seeker_ids)) {
          const seekerIds = session.seeker_ids as string[]
          const otherSeekers = seekerIds.filter(id => id !== user.id)
          
          if (otherSeekers.length > 0) {
            const { data: seekerProfiles } = await supabase
              .from('profiles')
              .select('id, display_name, username')
              .in('id', otherSeekers)

            if (seekerProfiles) {
              seekerProfiles.forEach(profile => {
                participantList.push({
                  id: profile.id,
                  name: profile.display_name || profile.username || 'Seeker',
                  isSherpa: false,
                })
              })
            }
          }
        }

        setParticipants(participantList)
        setLoadingParticipants(false)

        // Set default to first participant if available
        if (participantList.length > 0) {
          form.setValue('rated_profile_id', participantList[0].id)
          if (participantList[0].isSherpa) {
            form.setValue('teaching_skill_rating', 5)
          }
        }
      } catch (error) {
        console.error('Error loading participants:', error)
        setLoadingParticipants(false)
      }
    }

    loadParticipants()
  }, [sessionId, form])

  const selectedParticipant = participants.find(p => p.id === form.watch('rated_profile_id'))

  async function onSubmit(values: RatingFormValues) {
    setIsSubmitting(true)
    try {
      const input: SubmitOathkeeperRatingInput = {
        session_id: sessionId,
        rated_profile_id: values.rated_profile_id,
        helpfulness_rating: values.helpfulness_rating,
        patience_rating: values.patience_rating,
        teaching_skill_rating: selectedParticipant?.isSherpa ? values.teaching_skill_rating : undefined,
        overall_rating: values.overall_rating,
        feedback_text: values.feedback_text || undefined,
      }

      const result = await submitOathkeeperRating(input)
      
      if (result.success) {
        toast.success('Rating submitted successfully!', {
          description: 'Thank you for your feedback.',
        })
        onSuccess?.()
        router.refresh()
      }
    } catch (error: any) {
      toast.error('Failed to submit rating', {
        description: error.message || 'Please try again later.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loadingParticipants) {
    return <div className="text-sm text-muted-foreground">Loading participants...</div>
  }

  if (participants.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No other participants found in this session to rate.
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="rated_profile_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rate Participant *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select participant to rate" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {participants.map((participant) => (
                    <SelectItem key={participant.id} value={participant.id}>
                      {participant.name} {participant.isSherpa && '(Sherpa)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="helpfulness_rating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Helpfulness *</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(parseInt(value))} 
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select rating" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">1 - Poor</SelectItem>
                    <SelectItem value="2">2 - Fair</SelectItem>
                    <SelectItem value="3">3 - Good</SelectItem>
                    <SelectItem value="4">4 - Very Good</SelectItem>
                    <SelectItem value="5">5 - Excellent</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="patience_rating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Patience *</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(parseInt(value))} 
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select rating" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">1 - Poor</SelectItem>
                    <SelectItem value="2">2 - Fair</SelectItem>
                    <SelectItem value="3">3 - Good</SelectItem>
                    <SelectItem value="4">4 - Very Good</SelectItem>
                    <SelectItem value="5">5 - Excellent</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {selectedParticipant?.isSherpa && (
          <FormField
            control={form.control}
            name="teaching_skill_rating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teaching Skill *</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(parseInt(value))} 
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select rating" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">1 - Poor</SelectItem>
                    <SelectItem value="2">2 - Fair</SelectItem>
                    <SelectItem value="3">3 - Good</SelectItem>
                    <SelectItem value="4">4 - Very Good</SelectItem>
                    <SelectItem value="5">5 - Excellent</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Rate the Sherpa's teaching ability and communication skills.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="overall_rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Overall Rating *</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(parseInt(value))} 
                defaultValue={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select overall rating" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="1">1 - Poor</SelectItem>
                  <SelectItem value="2">2 - Fair</SelectItem>
                  <SelectItem value="3">3 - Good</SelectItem>
                  <SelectItem value="4">4 - Very Good</SelectItem>
                  <SelectItem value="5">5 - Excellent</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Your overall experience with this participant.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="feedback_text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Feedback (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Share your thoughts about the session..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Optional feedback to help improve future sessions.
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
            {isSubmitting ? 'Submitting...' : 'Submit Rating'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
