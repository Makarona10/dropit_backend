/*
  Warnings:

  - Added the required column `uniqueName` to the `File` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "File" ADD COLUMN     "uniqueName" VARCHAR(2048) NOT NULL;
