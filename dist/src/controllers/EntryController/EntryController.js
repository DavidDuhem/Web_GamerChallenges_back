import { prisma } from "../../../prisma/index.js";
import { entrySchema } from "../../schemas/entry.schema.js";
import BaseController from "../BaseController.js";
export default class EntryController extends BaseController {
    constructor() {
        super(prisma.entry, "entry_id");
    }
    async mostLikedEntries(req, res) {
        const data = await prisma.entry.findMany({
            select: {
                entry_id: true,
                title: true,
                user: {
                    select: {
                        avatar: true,
                        pseudo: true,
                    },
                },
                _count: {
                    select: {
                        entryVoters: true,
                    },
                },
            },
            orderBy: {
                entryVoters: {
                    _count: "desc",
                },
            },
            take: 3,
        });
        return res.status(200).json({ data });
    }
    async findAllEntries(req, res) {
        const userId = req.user?.id;
        const { challengeId } = req.params;
        if (!userId) {
            const entries = await prisma.challenge.findUnique({
                where: { challenge_id: Number(challengeId) },
                select: {
                    entries: {
                        select: {
                            entry_id: true,
                            title: true,
                            video_url: true,
                            user: {
                                select: {
                                    pseudo: true,
                                    avatar: true,
                                },
                            },
                        },
                        orderBy: {
                            created_at: "desc",
                        },
                    },
                },
            });
            if (!entries) {
                return res.status(404).json({ message: "Challenge not found" });
            }
            return res.status(200).json({ entries: entries.entries });
        }
        else {
            const [memberEntries, entries] = await Promise.all([
                prisma.entry.findMany({
                    where: {
                        AND: [{ challenge_id: Number(challengeId) }, { user_id: userId }],
                    },
                    include: {
                        user: {
                            select: {
                                pseudo: true,
                                avatar: true,
                            },
                        },
                        entryVoters: {
                            where: { user_id: userId },
                        },
                    },
                    orderBy: {
                        created_at: "desc",
                    },
                }),
                prisma.entry.findMany({
                    where: {
                        AND: [
                            { challenge_id: Number(challengeId) },
                            { user_id: { not: userId } },
                        ],
                    },
                    include: {
                        user: {
                            select: {
                                pseudo: true,
                                avatar: true,
                            },
                        },
                        entryVoters: {
                            where: { user_id: userId },
                        },
                    },
                    orderBy: {
                        created_at: "desc",
                    },
                }),
            ]);
            const memberEntriesWithVote = memberEntries.map(({ entryVoters, ...entry }) => ({
                ...entry,
                userHasVoted: entryVoters.length > 0,
            }));
            const entriesWithVote = entries.map(({ entryVoters, ...entry }) => ({
                ...entry,
                userHasVoted: entryVoters.length > 0,
            }));
            return res.status(200).json({
                memberEntries: memberEntriesWithVote,
                entries: entriesWithVote,
            });
        }
    }
    async postEntry(req, res) {
        const userId = req.user.id;
        const { challengeId } = req.params;
        const { title, video_url } = await entrySchema.parseAsync(req.body);
        this.create({
            title,
            video_url,
            user_id: userId,
            challenge_id: Number(challengeId),
        }).then((entry) => res.status(201).json({ entry }));
    }
    async updateEntry(req, res) {
        const userId = req.user.id;
        const { entryId } = req.params;
        const entryToUpdate = await prisma.entry.findUnique({
            where: {
                entry_id: Number(entryId),
                user_id: userId,
            },
        });
        if (!entryToUpdate) {
            return res
                .status(403)
                .json({ message: "Non autorisé à modifier cette participation" });
        }
        const validateEntry = entrySchema.safeParse(req.body);
        if (!validateEntry.success) {
            return res.status(400).json({
                message: "Données invalides",
                errors: validateEntry.error,
            });
        }
        const { title, video_url, challenge_id, user_id } = validateEntry.data;
        const response = await this.update(Number(entryId), {
            title,
            video_url,
            challenge_id,
            user_id,
        });
        return res.json({ response });
    }
    async deleteEntry(req, res) {
        const { entryId } = req.params;
        const userId = req.user.id;
        const entryToDelete = await prisma.entry.findUnique({
            where: {
                entry_id: Number(entryId),
                user_id: userId,
            },
        });
        if (!entryToDelete) {
            return res
                .status(403)
                .json({ message: "Non autorisé à supprimer cette participation" });
        }
        await this.delete(entryToDelete.entry_id);
        res.status(200).json({ message: entryToDelete });
    }
    async toggleEntryVote(req, res) {
        const entryId = parseInt(req.params.entryId);
        const userId = req.user.id;
        const entry = await this.findById(entryId);
        if (!entry) {
            return res
                .status(404)
                .json({ error: `Aucune participation trouvée avec l'id : ${entryId}` });
        }
        const alreadyVoted = await prisma.voteUserEntry.findUnique({
            where: {
                user_id_entry_id: { user_id: userId, entry_id: entryId },
            },
        });
        if (alreadyVoted) {
            await prisma.voteUserEntry.delete({
                where: {
                    user_id_entry_id: { user_id: userId, entry_id: entryId },
                },
            });
            return res.status(200).json({ voted: false });
        }
        else {
            await prisma.voteUserEntry.create({
                data: { user_id: userId, entry_id: entryId },
            });
            return res.status(201).json({ voted: true });
        }
    }
}
