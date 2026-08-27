// lib/prisma.ts
// Singleton Prisma client (avoids exhausting connections on hot-reload / serverless).
// If your repo already exports `prisma` from lib/db.ts or similar, SKIP this file
// and change the imports in the route files to point at your existing client.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
