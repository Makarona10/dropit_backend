-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "thumbnail" VARCHAR(2048) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "thumbnail" VARCHAR(2048) NOT NULL DEFAULT '';
