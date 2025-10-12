-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('member', 'admin');

-- CreateEnum
CREATE TYPE "public"."TokenType" AS ENUM ('refresh', 'forgot_pswd');

-- CreateTable
CREATE TABLE "public"."user" (
    "user_id" SERIAL NOT NULL,
    "pseudo" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'member',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "public"."token" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "token_type" "public"."TokenType" NOT NULL,
    "user_id" INTEGER NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expired_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."game" (
    "game_id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "game_pkey" PRIMARY KEY ("game_id")
);

-- CreateTable
CREATE TABLE "public"."challenge" (
    "challenge_id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rules" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "game_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "challenge_pkey" PRIMARY KEY ("challenge_id")
);

-- CreateTable
CREATE TABLE "public"."entry" (
    "entry_id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "video_url" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "challenge_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "entry_pkey" PRIMARY KEY ("entry_id")
);

-- CreateTable
CREATE TABLE "public"."vote_user_challenge" (
    "user_id" INTEGER NOT NULL,
    "challenge_id" INTEGER NOT NULL,

    CONSTRAINT "vote_user_challenge_pkey" PRIMARY KEY ("user_id","challenge_id")
);

-- CreateTable
CREATE TABLE "public"."vote_user_entry" (
    "user_id" INTEGER NOT NULL,
    "entry_id" INTEGER NOT NULL,

    CONSTRAINT "vote_user_entry_pkey" PRIMARY KEY ("user_id","entry_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_pseudo_key" ON "public"."user"("pseudo");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "public"."user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "token_token_key" ON "public"."token"("token");

-- CreateIndex
CREATE UNIQUE INDEX "game_title_key" ON "public"."game"("title");

-- AddForeignKey
ALTER TABLE "public"."token" ADD CONSTRAINT "token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."challenge" ADD CONSTRAINT "challenge_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."challenge" ADD CONSTRAINT "challenge_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."game"("game_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."entry" ADD CONSTRAINT "entry_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."entry" ADD CONSTRAINT "entry_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenge"("challenge_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vote_user_challenge" ADD CONSTRAINT "vote_user_challenge_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vote_user_challenge" ADD CONSTRAINT "vote_user_challenge_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenge"("challenge_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vote_user_entry" ADD CONSTRAINT "vote_user_entry_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vote_user_entry" ADD CONSTRAINT "vote_user_entry_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "public"."entry"("entry_id") ON DELETE CASCADE ON UPDATE CASCADE;
