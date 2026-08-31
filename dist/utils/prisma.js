"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../generated/prisma");
// Initialize core client
const basePrisma = new prisma_1.PrismaClient();
// Create an extended client for soft deletes
const prisma = basePrisma.$extends({
    query: {
        $allModels: {
            async findMany({ args, query }) {
                args.where = { ...args.where, deleted_at: null };
                return query(args);
            },
            async findFirst({ args, query }) {
                args.where = { ...args.where, deleted_at: null };
                return query(args);
            },
            // Note: findUnique doesn't support arbitrary where clauses (like deleted_at: null)
            // gracefully without changing it to findFirst, so we handle soft-deletes manually for findUnique 
            // or rely on findFirst whenever soft-delete awareness is needed.
            async delete({ model, operation, args, query }) {
                // Convert delete to soft delete by setting deleted_at to current time
                return basePrisma[model].update({
                    ...args,
                    data: { deleted_at: new Date() },
                });
            },
            async deleteMany({ model, operation, args, query }) {
                // Convert deleteMany to soft delete Many
                return basePrisma[model].updateMany({
                    ...args,
                    data: { deleted_at: new Date() },
                });
            },
        },
    },
});
exports.default = prisma;
