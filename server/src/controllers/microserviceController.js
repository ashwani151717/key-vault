"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMicroservices = getMicroservices;
const zod_1 = require("zod");
const errors_1 = require("../lib/errors");
const vaultService_1 = require("../services/vaultService");
const querySchema = zod_1.z.object({
    projectId: zod_1.z.string().optional(),
    q: zod_1.z.string().optional(),
});
async function getMicroservices(req, res) {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
        throw new errors_1.AppError('Invalid microservice query', 400, 'VALIDATION_ERROR');
    }
    res.json({ microservices: await (0, vaultService_1.listMicroservices)(parsed.data.projectId, parsed.data.q) });
}
