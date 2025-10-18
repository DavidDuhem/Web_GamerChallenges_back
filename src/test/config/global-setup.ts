import { after, before, beforeEach } from "node:test"
import path from "node:path"
import { $ } from "zx"
import { Server } from "node:http"
import { app } from "../../app.js"
import { prisma } from "../../../prisma/index.js"

let server: Server

before(async () => {
  const composeFileAbsolutePath = path
    .resolve(import.meta.dirname, "compose.test.yml")
    .replace(/\\/g, "/")

  await $`docker compose -f "${composeFileAbsolutePath}" -p gamerchallengestest up -d`
  await new Promise((r) => setTimeout(r, 1000))

  const prismaSchemaAbsolutePath = path.resolve(
    import.meta.dirname,
    "../../../prisma/schema.prisma"
  )
  await $`npx prisma db push --schema=${prismaSchemaAbsolutePath}`
  server = app.listen(process.env.PORT)
})

beforeEach(async () => {
  await truncateTables()
})

after(async () => {
  server.close()
  await prisma.$disconnect()
  await $`docker compose -p gamerchallengestest down > /dev/null 2>&1`
})

async function truncateTables() {
  await prisma.$executeRawUnsafe(`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'TRUNCATE TABLE "' || r.tablename || '" RESTART IDENTITY CASCADE';
      END LOOP;
    END $$;
  `)
}
