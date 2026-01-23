import { z } from 'zod'

export const secretsSchema = z.object({
  secrets: z.array(
    z.object({
      name: z.string().min(1, 'Secret name is required'),
      value: z.string().min(1, 'Secret value is required'),
    })
  ),
})

export type SecretsSchema = z.infer<typeof secretsSchema>
