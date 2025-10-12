import { z } from "zod"

export const entrySchema = z.object({
  title: z.string().min(3, "Le titre doit contenir au moins 3 caractères"),
  video_url: z
    .string()
    .min(10, "La description doit contenir au moins 10 caractères")
    .refine((val) => !/<script.*?>.*?<\/script>/i.test(val), {
      message: "La description ne doit pas contenir de balises <script>",
    }),
  user_id: z.number(),
  challenge_id: z.number(),
})

export type EntryInput = z.infer<typeof entrySchema>
