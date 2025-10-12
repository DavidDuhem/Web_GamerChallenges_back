import { z } from "zod"

export const challengeSchema = z.object({
  title: z.string().min(3, "Le titre doit contenir au moins 3 caractères"),
  description: z
    .string()
    .min(10, "La description doit contenir au moins 10 caractères")
    .refine((val) => !/<script.*?>.*?<\/script>/i.test(val), {
      message: "La description ne doit pas contenir de balises <script>",
    }),
  rules: z
    .string()
    .min(10, "Les règles doivent contenir au moins 10 caractères")
    .refine((val) => !/<script.*?>.*?<\/script>/i.test(val), {
      message: "Les règles ne doivent pas contenir de balises <script>",
    }),
  game_title: z.string(),
  game_id: z.string().optional(),
})

export type ChallengeInput = z.infer<typeof challengeSchema>
