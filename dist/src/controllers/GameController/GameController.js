import { prisma } from "../../../prisma/index.js";
import BaseController from "../BaseController.js";
import { logger } from "../../lib/log.js";
export default class GameController extends BaseController {
    constructor() {
        super(prisma.game, "game_id");
    }
    async getAllGames(req, res) {
        try {
            const games = await prisma.game.findMany({
                where: {
                    deleted_at: null, // Exclude soft-deleted games
                },
                select: {
                    game_id: true,
                    title: true,
                    image_url: true,
                },
                orderBy: {
                    title: "asc",
                },
            });
            return res.status(200).json({ data: games });
        }
        catch (error) {
            logger.error("Erreur lors de la récupération des jeux :", error);
            return res.status(500).json({ message: "Erreur serveur" });
        }
    }
}
