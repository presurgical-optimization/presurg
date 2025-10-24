/*
  Warnings:

  - You are about to drop the `Patient` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('doctor', 'patient');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SurgeryStatus" AS ENUM ('PLANNED', 'CONFIRMED', 'COMPLETED', 'CANCELED', 'POSTPONED');

-- DropTable
DROP TABLE "public"."Patient";

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "ssn" VARCHAR(11),
    "dob" DATE NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurgeryGuideline" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurgeryGuideline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuidelineItem" (
    "id" SERIAL NOT NULL,
    "surgeryGuidelineId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "itemKey" TEXT,
    "type" TEXT,
    "window" JSONB,
    "appliesIf" JSONB,

    CONSTRAINT "GuidelineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Surgery" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "doctorId" INTEGER NOT NULL,
    "guidelineId" INTEGER,
    "scheduledAt" TIMESTAMP(3),
    "location" TEXT,
    "status" "SurgeryStatus" NOT NULL DEFAULT 'PLANNED',
    "currentPublishedVersionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Surgery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurgeryPlanVersion" (
    "id" SERIAL NOT NULL,
    "surgeryId" INTEGER NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'DRAFT',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "basedOnGuidelineId" INTEGER,
    "basedOnVersionId" INTEGER,
    "authorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "instructions" JSONB NOT NULL,

    CONSTRAINT "SurgeryPlanVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_ssn_key" ON "User"("ssn");

-- CreateIndex
CREATE INDEX "User_role_dob_ssn_idx" ON "User"("role", "dob", "ssn");

-- CreateIndex
CREATE UNIQUE INDEX "GuidelineItem_surgeryGuidelineId_itemKey_key" ON "GuidelineItem"("surgeryGuidelineId", "itemKey");

-- CreateIndex
CREATE UNIQUE INDEX "Surgery_currentPublishedVersionId_key" ON "Surgery"("currentPublishedVersionId");

-- CreateIndex
CREATE INDEX "Surgery_doctorId_scheduledAt_idx" ON "Surgery"("doctorId", "scheduledAt");

-- CreateIndex
CREATE INDEX "Surgery_patientId_scheduledAt_idx" ON "Surgery"("patientId", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "SurgeryPlanVersion_surgeryId_versionNo_key" ON "SurgeryPlanVersion"("surgeryId", "versionNo");

-- AddForeignKey
ALTER TABLE "GuidelineItem" ADD CONSTRAINT "GuidelineItem_surgeryGuidelineId_fkey" FOREIGN KEY ("surgeryGuidelineId") REFERENCES "SurgeryGuideline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Surgery" ADD CONSTRAINT "Surgery_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Surgery" ADD CONSTRAINT "Surgery_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Surgery" ADD CONSTRAINT "Surgery_guidelineId_fkey" FOREIGN KEY ("guidelineId") REFERENCES "SurgeryGuideline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Surgery" ADD CONSTRAINT "Surgery_currentPublishedVersionId_fkey" FOREIGN KEY ("currentPublishedVersionId") REFERENCES "SurgeryPlanVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgeryPlanVersion" ADD CONSTRAINT "SurgeryPlanVersion_surgeryId_fkey" FOREIGN KEY ("surgeryId") REFERENCES "Surgery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgeryPlanVersion" ADD CONSTRAINT "SurgeryPlanVersion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
