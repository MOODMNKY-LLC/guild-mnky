import { z } from 'zod'

export const authEmailProviderSchema = z.object({
  enabled: z.boolean().optional(),
  // Add other email provider fields as needed
})

export const authGoogleProviderSchema = z.object({
  enabled: z.boolean().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
})

export const authPhoneProviderSchema = z.object({
  enabled: z.boolean().optional(),
  // Add other phone provider fields as needed
})

export const authGeneralSettingsSchema = z.object({
  siteUrl: z.string().url().optional(),
  jwtExpiry: z.number().optional(),
  // Add other general settings fields as needed
})

export type AuthGeneralSettingsSchema = z.infer<typeof authGeneralSettingsSchema>

export const authFieldLabels = {
  siteUrl: 'Site URL',
  jwtExpiry: 'JWT Expiry',
  enabled: 'Enabled',
  clientId: 'Client ID',
  clientSecret: 'Client Secret',
}
