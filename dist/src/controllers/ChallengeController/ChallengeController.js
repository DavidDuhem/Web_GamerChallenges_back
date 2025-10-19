import z from "zod";
import { prisma } from "../../../prisma/index.js";
import { challengeSchema } from "../../schemas/challenge.schema.js";
import BaseController from "../BaseController.js";
import { logger } from "../../lib/log.js";
export default class ChallengeController extends BaseController {
    constructor() {
        super(prisma.challenge, "challenge_id");
    }
    async newestChallenges(req, res) {
        const data = await prisma.challenge.findMany({
            select: {
                challenge_id: true,
                created_at: true,
                title: true,
                user: {
                    select: {
                        pseudo: true,
                    },
                },
                game: {
                    select: {
                        title: true,
                        image_url: true,
                    },
                },
            },
            orderBy: {
                created_at: "desc",
            },
            take: 4,
        });
        return res.status(200).json({ data });
    }
    async mostLikedChallenges(req, res) {
        const data = await prisma.challenge.findMany({
            select: {
                challenge_id: true,
                title: true,
                game_id: true,
                game: {
                    select: {
                        image_url: true,
                    },
                },
                _count: {
                    select: {
                        challengeVoters: true,
                    },
                },
            },
            orderBy: {
                challengeVoters: {
                    _count: "desc",
                },
            },
            take: 3,
        });
        return res.status(200).json({ data });
    }
    async findAllWithPagination(req, res) {
        const userId = req.user?.id;
        const { page, limit } = await z
            .object({
            limit: z.coerce.number().int().min(1).optional().default(5),
            page: z.coerce.number().int().min(1).optional().default(1),
        })
            .parseAsync(req.query);
        if (!userId) {
            const [challenges, totalPages] = await Promise.all([
                prisma.challenge.findMany({
                    skip: (page - 1) * limit,
                    take: limit,
                    include: {
                        game: true,
                    },
                }),
                prisma.challenge.count(),
            ]);
            const nbPages = Math.ceil(totalPages / limit);
            return res.status(200).json({ challenges, nbPages });
        }
        else {
            const [memberChallenges, challenges, totalFilteredPages] = await Promise.all([
                prisma.challenge.findMany({
                    where: { user_id: userId },
                    include: {
                        game: true,
                    },
                }),
                prisma.challenge.findMany({
                    skip: (page - 1) * limit,
                    take: limit,
                    where: {
                        user_id: {
                            not: userId,
                        },
                    },
                    include: {
                        game: true,
                    },
                }),
                prisma.challenge.count({
                    where: {
                        user_id: {
                            not: userId,
                        },
                    },
                }),
            ]);
            const nbPages = Math.ceil(totalFilteredPages / limit);
            return res.status(200).json({ memberChallenges, challenges, nbPages });
        }
    }
    async findUniqueChallenge(req, res) {
        const { challengeId } = req.params;
        const challenge = await prisma.challenge.findUnique({
            where: { challenge_id: Number(challengeId) },
            select: {
                challenge_id: true,
                title: true,
                created_at: true,
                description: true,
                rules: true,
                game: {
                    select: {
                        title: true,
                        image_url: true,
                    },
                },
                user: {
                    select: {
                        user_id: true,
                        pseudo: true,
                        avatar: true,
                    },
                },
            },
        });
        if (!challenge) {
            return res.status(404).json({ message: "Challenge not found" });
        }
        let userHasVoted = false;
        if (req.user && req.user.id) {
            const findVote = await prisma.voteUserChallenge.findUnique({
                where: {
                    user_id_challenge_id: {
                        user_id: req.user.id,
                        challenge_id: Number(challengeId),
                    },
                },
            });
            userHasVoted = !!findVote;
        }
        return res.status(200).json({
            ...challenge,
            user: {
                id: challenge.user.user_id,
                pseudo: challenge.user.pseudo,
                avatar: challenge.user.avatar,
            },
            userHasVoted,
        });
    }
    //Challenge
    async createChallenge(req, res) {
        const result = challengeSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({
                error: "Validation échouée",
                details: result.error.issues,
            });
        }
        try {
            const { title, description, rules, game_title } = result.data;
            const game = await prisma.game.findUnique({
                where: { title: game_title },
            });
            if (!req.user || !req.user.id) {
                return res.status(401).json({ error: "Utilisateur non authentifié" });
            }
            if (!game) {
                return res.status(404).json({ error: "Jeu non trouvé" });
            }
            const newChallenge = await this.create({
                title,
                description,
                rules,
                game_id: game.game_id,
                user_id: req.user.id,
            });
            return res.status(201).json({
                message: "Challenge créé",
                challenge: newChallenge,
            });
        }
        catch (err) {
            logger.error(err);
            return res.status(500).json({
                error: "Erreur serveur",
                details: err instanceof Error ? err.message : "Erreur inconnue",
            });
        }
    }
    async updateChallenge(req, res) {
        if (req.user) {
            const { challengeId } = req.params;
            const { id: userId } = req.user;
            const challentToUpdate = await prisma.challenge.findUnique({
                where: {
                    challenge_id: Number(challengeId),
                    user_id: userId,
                },
            });
            if (!challentToUpdate) {
                return res
                    .status(403)
                    .json({ message: "Non autorisé à modifier ce challenge" });
            }
            const validateChallenge = challengeSchema.safeParse(req.body);
            if (!validateChallenge.success) {
                return res.status(400).json({
                    message: "Données invalides",
                    errors: validateChallenge.error,
                });
            }
            const { title, description, rules, game_id } = validateChallenge.data;
            const response = await this.update(Number(challengeId), {
                title,
                description,
                rules,
                game_id,
            });
            return res.json({ response });
        }
    }
    async deleteChallenge(req, res) {
        if (req.user) {
            const { challengeId } = req.params;
            const { id } = req.user;
            const challentToDelete = await prisma.challenge.findUnique({
                where: {
                    challenge_id: Number(challengeId),
                    user_id: id,
                },
            });
            if (!challentToDelete) {
                return res
                    .status(403)
                    .json({ message: "Non autorisé à supprimer ce challenge" });
            }
            await this.delete(challentToDelete.challenge_id);
            res.status(200).json({ message: challentToDelete });
        }
    }
    async toggleChallengeVote(req, res) {
        const challengeId = parseInt(req.params.id);
        const userId = req.user.id;
        const challenge = await this.findById(challengeId);
        if (!challenge) {
            return res
                .status(404)
                .json({ error: `Aucun challenge trouvé avec l'id : ${challengeId}` });
        }
        const alreadyVoted = await prisma.voteUserChallenge.findUnique({
            where: {
                user_id_challenge_id: { user_id: userId, challenge_id: challengeId },
            },
        });
        if (alreadyVoted) {
            await prisma.voteUserChallenge.delete({
                where: {
                    user_id_challenge_id: { user_id: userId, challenge_id: challengeId },
                },
            });
            return res.status(200).json({ voted: false });
        }
        else {
            await prisma.voteUserChallenge.create({
                data: { user_id: userId, challenge_id: challengeId },
            });
            return res.status(201).json({ voted: true });
        }
    }
}
