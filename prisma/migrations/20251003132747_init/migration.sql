/*
  Warnings:

  - You are about to drop the column `expired_at` on the `token` table. All the data in the column will be lost.
  - Added the required column `expires_at` to the `token` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."token" DROP COLUMN "expired_at",
ADD COLUMN     "expires_at" TIMESTAMP(3) NOT NULL;
