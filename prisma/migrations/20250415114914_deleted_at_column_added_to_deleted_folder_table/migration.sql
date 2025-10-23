/*
  Warnings:

  - You are about to drop the column `deletionOn` on the `DeletedFiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DeletedFiles" DROP COLUMN "deletionOn",
ADD COLUMN     "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "DeletedFolders" ADD COLUMN     "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
