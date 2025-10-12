import { Role, VoteUserChallenge, VoteUserEntry } from "@prisma/client"
import { prisma } from "./index.js"
import argon2 from "argon2"
import { shuffleData } from "../src/utils/shuffleData.js"
import { logger } from "../src/lib/log.js"

interface GameResponse {
  title: string
  thumbnail: string
}
interface EntryInterface {
  title: string
  video_url: string
  user_id: number
  challenge_id: number
}
const { challenge, entry, game, user, voteUserChallenge, voteUserEntry } =
  prisma
const hashedPassword = await argon2.hash("test")

const clearSeeding = async () => {
  await voteUserChallenge.deleteMany()
  await voteUserEntry.deleteMany()
  await entry.deleteMany()
  await challenge.deleteMany()
}

const SeedGames = async () => {
  const response = await fetch("https://www.freetogame.com/api/games")
  const games: GameResponse[] = await response.json()
  await game.createMany({
    data: games.map(({ title, thumbnail }) => ({
      title,
      image_url: thumbnail,
    })),
    skipDuplicates: true,
  })
  logger.info("✅  20 games crée avec succés")
}

const SeedUsers = async () => {
  const avatars = [
    "https://i.pravatar.cc/150?img=1",
    "https://i.pravatar.cc/150?img=2",
    "https://i.pravatar.cc/150?img=3",
    "https://i.pravatar.cc/150?img=4",
    "https://i.pravatar.cc/150?img=5",
    "https://i.pravatar.cc/150?img=6",
    "https://i.pravatar.cc/150?img=7",
    "https://i.pravatar.cc/150?img=8",
    "https://i.pravatar.cc/150?img=9",
    "https://i.pravatar.cc/150?img=10",
  ]

  const users = Array.from({ length: 40 }).map((_, i) => ({
    pseudo: `User${i + 1}`,
    email: `user${i + 1}@example.com`,
    password: hashedPassword,
    avatar: avatars[i % avatars.length],
    role: i < 5 ? Role.admin : Role.member,
  }))

  await user.createMany({
    data: [...users],
    skipDuplicates: true,
  })

  logger.info("✅ 40 users créés avec succès !")
}

const SeedChallenge = async () => {
  const games = await game.findMany({ take: 20 })
  if (games.length === 0) {
    logger.info("Aucun jeux")
    return
  }
  const users = await user.findMany({ take: 2 })
  if (users.length === 0) {
    logger.info("Aucun User")
    return
  }
  const sampleTitles = [
    "Speedrun Madness",
    "No Damage Run",
    "Pacifist Mode",
    "Hardcore Survival",
    "Time Attack",
    "Ironman Challenge",
    "One Weapon Only",
    "Stealth Assassin",
    "Marathon Mode",
    "Boss Rush",
  ]

  const sampleDescriptions = [
    "Complète le jeu sans perdre une seule vie.",
    "Finis le niveau en moins de 5 minutes.",
    "Utilise uniquement ton arme de départ.",
    "Survis le plus longtemps possible sans sauvegarde.",
    "Atteins le boss final avec moins de 3 items.",
    "Complète le mode difficile sans checkpoint.",
  ]

  const sampleRules = [
    "Pas de triche autorisée.",
    "Capture vidéo obligatoire.",
    "Multijoueur interdit.",
    "Difficulté minimum : Normal.",
    "Aucune pause acceptée.",
  ]

  const challenges = Array.from({ length: 20 }).map((_, index) => {
    const randomGame = games[Math.floor(Math.random() * games.length)]
    const randomUser = users[Math.floor(Math.random() * users.length)]
    return {
      title: sampleTitles[index % sampleTitles.length],
      description: sampleDescriptions[index % sampleDescriptions.length],
      rules: sampleRules[index % sampleRules.length],
      user_id: randomUser.user_id,
      game_id: randomGame.game_id,
    }
  })
  await challenge.createMany({
    data: challenges,
    skipDuplicates: true,
  })
  logger.info("✅ 20 challenges crée avec succés")
}

const SeedEntries = async () => {
  const challenges = await challenge.findMany()
  const users = await user.findMany()
  if (challenges.length === 0 || users.length === 0) {
    logger.info(
      "Pas de challenges ou d’utilisateurs pour créer des participations"
    )
    return
  }
  const sampleTitles = [
    "First Try Run",
    "Ultimate Speedrun",
    "No Hit Clear",
    "Pro Gamer Attempt",
    "Clutch Finish",
  ]

  const sampleVideos = [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=3JZ_D3ELwOQ",
    "https://www.youtube.com/watch?v=V-_O7nl0Ii0",
  ]

  const entries: EntryInterface[] = []
  for (const challenge of challenges) {
    const nbEntries = Math.floor(Math.random() * 4)

    for (let i = 0; i < nbEntries; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)]
      const randomTitle =
        sampleTitles[Math.floor(Math.random() * sampleTitles.length)]
      const randomVideo =
        sampleVideos[Math.floor(Math.random() * sampleVideos.length)]

      entries.push({
        title: randomTitle,
        video_url: randomVideo,
        user_id: randomUser.user_id,
        challenge_id: challenge.challenge_id,
      })
    }
  }
  if (entries.length > 0) {
    await entry.createMany({
      data: entries,
      skipDuplicates: true,
    })
    logger.info(`✅ ${entries.length} participations créées avec succès`)
  } else {
    logger.info("Aucune participation générée (tirage aléatoire = 0).")
  }
}

const seedVoteChallenge = async () => {
  const allChallenges = await challenge.findMany()
  const allUsers = await user.findMany()
  const voteChallengeData: VoteUserChallenge[] = []
  for (const user of allUsers) {
    const nbVotes = Math.floor(Math.random() * 6)
    const shuffledChallenges = shuffleData(allChallenges, nbVotes)
    for (const ch of shuffledChallenges) {
      voteChallengeData.push({
        user_id: user.user_id,
        challenge_id: ch.challenge_id,
      })
    }
  }
  await voteUserChallenge.createMany({
    data: voteChallengeData,
    skipDuplicates: true,
  })
  logger.info(`✅ ${voteChallengeData.length} Votes sur challenges créés`)
}

const seedVoteUserEntry = async () => {
  const allUsers = await user.findMany()
  const allEntries = await entry.findMany()
  const voteEntryData: VoteUserEntry[] = []

  for (const user of allUsers) {
    const nbVotes = Math.floor(Math.random() * 6)
    const shuffledEntries = shuffleData(allEntries, nbVotes)
    for (const entry of shuffledEntries) {
      voteEntryData.push({
        user_id: user.user_id,
        entry_id: entry.entry_id,
      })
    }
  }

  await voteUserEntry.createMany({
    data: voteEntryData,
    skipDuplicates: true,
  })
  logger.info(`✅ ${voteEntryData.length} Votes sur entries créés`)
}
await clearSeeding()
await SeedUsers()
await SeedGames()
await SeedChallenge()
await SeedEntries()
await seedVoteChallenge()
await seedVoteUserEntry()

logger.info(`📊 Seeding succeeded.`)
