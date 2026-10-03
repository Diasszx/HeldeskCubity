BEGIN;

-- PostgreSQL sequences are atomic; gaps are intentional and never reused.
CREATE SEQUENCE public.request_code_seq AS BIGINT NO CYCLE;
CREATE FUNCTION public.next_request_code() RETURNS text
LANGUAGE sql VOLATILE AS $$
  WITH number AS (SELECT nextval('public.request_code_seq')::text AS value)
  SELECT 'SOL-' || lpad(value, GREATEST(4, length(value)), '0') FROM number;
$$;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(120) NOT NULL,
    "username" VARCHAR(64) NOT NULL,
    "passwordHash" VARCHAR(60) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(80) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Request" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(32) NOT NULL DEFAULT next_request_code(),
    "title" VARCHAR(60) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "categoryId" UUID NOT NULL,
    "requesterId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "RequestStatus" NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "sid" VARCHAR NOT NULL,
    "sess" JSON NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Request_code_key" ON "Request"("code");

-- CreateIndex
CREATE INDEX "Request_createdAt_id_idx" ON "Request"("createdAt", "id");

-- CreateIndex
CREATE INDEX "Request_categoryId_createdAt_idx" ON "Request"("categoryId", "createdAt");

-- CreateIndex
CREATE INDEX "Request_status_createdAt_idx" ON "Request"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Request_requesterId_idx" ON "Request"("requesterId");

-- CreateIndex
CREATE INDEX "IDX_session_expire" ON "session"("expire");

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Request" ADD CONSTRAINT "Request_title_not_blank"
  CHECK ("title" !~ '^[[:space:]]*$');
ALTER TABLE "Request" ADD CONSTRAINT "Request_description_not_blank"
  CHECK ("description" !~ '^[[:space:]]*$');
ALTER TABLE "User" ADD CONSTRAINT "User_username_normalized"
  CHECK ("username" ~ '^[a-z0-9][a-z0-9._-]*$');

COMMIT;
