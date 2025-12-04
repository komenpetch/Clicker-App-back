/*
  Warnings:

  - Added the required column `updatedAt` to the `Counter` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Counter` ADD COLUMN `clicksPerClick` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    ADD COLUMN `upgrades` VARCHAR(191) NOT NULL DEFAULT '';
