/*
  Warnings:

  - Added the required column `adresse` to the `Inscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `birthDate` to the `Inscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `codePostal` to the `Inscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `motDePasse` to the `Inscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `telephone` to the `Inscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ville` to the `Inscription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Inscription" ADD COLUMN     "adresse" TEXT NOT NULL,
ADD COLUMN     "birthDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "codePostal" TEXT NOT NULL,
ADD COLUMN     "motDePasse" TEXT NOT NULL,
ADD COLUMN     "telephone" TEXT NOT NULL,
ADD COLUMN     "ville" TEXT NOT NULL;
