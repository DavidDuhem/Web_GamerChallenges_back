import { after, before, beforeEach } from "node:test";
import path from "node:path";
import { $ } from "zx";
import { app } from "../../app.js";
import { prisma } from "../../../prisma/index.js";
let server;
async function waitForPostgres(host = "localhost", port = 5437, user = "test") {
    const { exec } = await import("child_process");
    const wait = () => new Promise((resolve) => setTimeout(resolve, 2000));
    for (let i = 0; i < 15; i++) {
        try {
            await $ `pg_isready -h ${host} -p ${port} -U ${user}`;
            return;
        }
        catch {
            console.log("Waiting for Postgres...");
            await wait();
        }
    }
    throw new Error("Postgres did not become ready in time");
}
before(async () => {
    const composeFileAbsolutePath = path
        .resolve(import.meta.dirname, "compose.test.yml")
        .replace(/\\/g, "/");
    if (!process.env.CI) {
        await $ `docker compose -f "${composeFileAbsolutePath}" -p gamerchallengestest up -d`;
        //   await new Promise((r) => setTimeout(r, 1000))
        await waitForPostgres();
    }
    else {
        console.log("Running in CI, skipping docker compose up");
    }
    const prismaSchemaAbsolutePath = path.resolve(import.meta.dirname, "../../../prisma/schema.prisma");
    await $ `npx prisma db push --schema=${prismaSchemaAbsolutePath}`;
    server = app.listen(process.env.PORT);
});
beforeEach(async () => {
    await truncateTables();
});
after(async () => {
    server.close();
    await prisma.$disconnect();
    if (!process.env.CI) {
        await $ `docker compose -p gamerchallengestest down > /dev/null 2>&1`;
    }
});
async function truncateTables() {
    await prisma.$executeRawUnsafe(`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'TRUNCATE TABLE "' || r.tablename || '" RESTART IDENTITY CASCADE';
      END LOOP;
    END $$;
  `);
}
