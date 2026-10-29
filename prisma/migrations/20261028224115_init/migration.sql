/*
  Warnings:

  - You are about to drop the `announcements` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `applications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `course_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `materials` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `programs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "announcements" DROP CONSTRAINT "announcements_authorId_fkey";

-- DropForeignKey
ALTER TABLE "announcements" DROP CONSTRAINT "announcements_programId_fkey";

-- DropForeignKey
ALTER TABLE "applications" DROP CONSTRAINT "applications_programId_fkey";

-- DropForeignKey
ALTER TABLE "applications" DROP CONSTRAINT "applications_userId_fkey";

-- DropForeignKey
ALTER TABLE "course_sessions" DROP CONSTRAINT "course_sessions_programId_fkey";

-- DropForeignKey
ALTER TABLE "materials" DROP CONSTRAINT "materials_programId_fkey";

-- DropForeignKey
ALTER TABLE "programs" DROP CONSTRAINT "programs_supervisorId_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_user_id_fkey";

-- DropTable
DROP TABLE "announcements";

-- DropTable
DROP TABLE "applications";

-- DropTable
DROP TABLE "course_sessions";

-- DropTable
DROP TABLE "materials";

-- DropTable
DROP TABLE "programs";

-- DropTable
DROP TABLE "sessions";

-- DropTable
DROP TABLE "users";

-- DropEnum
DROP TYPE "ApplicationStatus";

-- DropEnum
DROP TYPE "Role";
