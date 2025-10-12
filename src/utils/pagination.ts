/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express"
import z from "zod"
import { prisma } from "../../prisma/index.js"
import { PrismaClient } from "@prisma/client"

export const Pagination = async (
  req: Request,
  res: Response,
  model: keyof PrismaClient,
  options?: any
) => {
  const modelClient = prisma[model] as any
  const { page, limit } = await z
    .object({
      limit: z.coerce.number().int().min(1).optional().default(6),
      page: z.coerce.number().int().min(1).optional().default(1),
    })
    .parseAsync(req.query)

  const [data, totaldata] = await Promise.all([
    modelClient.findMany({
      ...(page && { skip: (page - 1) * limit }),
      ...(limit && { take: limit }),
    }),
    await modelClient.count(),
  ])
  const nbPages = Math.ceil(totaldata / limit)
  return res.status(200).json({ data, nbPages })
}
