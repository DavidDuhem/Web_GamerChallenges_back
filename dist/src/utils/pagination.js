import z from "zod";
import { prisma } from "../../prisma/index.js";
export const Pagination = async (req, res, model, options) => {
    const modelClient = prisma[model];
    const { page, limit } = await z
        .object({
        limit: z.coerce.number().int().min(1).optional().default(6),
        page: z.coerce.number().int().min(1).optional().default(1),
    })
        .parseAsync(req.query);
    const [data, totaldata] = await Promise.all([
        modelClient.findMany({
            ...(page && { skip: (page - 1) * limit }),
            ...(limit && { take: limit }),
        }),
        await modelClient.count(),
    ]);
    const nbPages = Math.ceil(totaldata / limit);
    return res.status(200).json({ data, nbPages });
};
