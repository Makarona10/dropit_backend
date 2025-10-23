/*
  Warnings:

  - You are about to drop the `FilesTags` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `fileId` to the `Tag` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "FilesTags" DROP CONSTRAINT "FilesTags_fileId_fkey";

-- DropForeignKey
ALTER TABLE "FilesTags" DROP CONSTRAINT "FilesTags_tagId_fkey";

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "fileId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "FilesTags";

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
