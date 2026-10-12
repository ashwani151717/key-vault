"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getResolvedVault = getResolvedVault;
exports.getVaultById = getVaultById;
exports.getVaultVersions = getVaultVersions;
exports.getVaultVersionByDate = getVaultVersionByDate;
exports.postPreviewUpdate = postPreviewUpdate;
exports.postVaultUpdate = postVaultUpdate;
const zod_1 = require("zod");
const errors_1 = require("../lib/errors");
const excelService_1 = require("../services/excelService");
const vaultService_1 = require("../services/vaultService");
const resolveQuery = zod_1.z.object({
    projectId: zod_1.z.string().min(1),
    microserviceId: zod_1.z.string().min(1),
    environment: zod_1.z.string().min(1),
    date: zod_1.z.string().optional(),
    version: zod_1.z.string().regex(/^\d+$/).optional(),
    reveal: zod_1.z.enum(['true', 'false']).optional(),
});
const vaultQuery = zod_1.z.object({
    version: zod_1.z.string().regex(/^\d+$/).optional(),
    reveal: zod_1.z.enum(['true', 'false']).optional(),
});
const dateQuery = zod_1.z.object({
    date: zod_1.z.string().min(1),
});
function requireFile(req) {
    if (!req.file)
        throw new errors_1.AppError('An Excel file is required', 400, 'FILE_REQUIRED');
    return req.file;
}
async function getResolvedVault(req, res) {
    const parsed = resolveQuery.safeParse(req.query);
    if (!parsed.success)
        throw new errors_1.AppError('Project, microservice, and environment are required', 400, 'VALIDATION_ERROR');
    const snapshot = await (0, vaultService_1.resolveVault)({
        projectId: parsed.data.projectId,
        microserviceId: parsed.data.microserviceId,
        environment: parsed.data.environment,
        date: parsed.data.date || undefined,
        version: parsed.data.version ? Number(parsed.data.version) : undefined,
        reveal: parsed.data.reveal === 'true',
        actorId: req.actor?.id,
    });
    res.json(snapshot);
}
async function getVaultById(req, res) {
    const parsed = vaultQuery.safeParse(req.query);
    if (!parsed.success)
        throw new errors_1.AppError('Invalid vault query', 400, 'VALIDATION_ERROR');
    const snapshot = await (0, vaultService_1.getVault)(String(req.params.vaultId), {
        version: parsed.data.version ? Number(parsed.data.version) : undefined,
        reveal: parsed.data.reveal === 'true',
        actorId: req.actor?.id,
    });
    res.json(snapshot);
}
async function getVaultVersions(req, res) {
    res.json({ versions: await (0, vaultService_1.listVersions)(String(req.params.vaultId)) });
}
async function getVaultVersionByDate(req, res) {
    const parsed = dateQuery.safeParse(req.query);
    if (!parsed.success)
        throw new errors_1.AppError('Date is required', 400, 'VALIDATION_ERROR');
    res.json(await (0, vaultService_1.getVersionByDate)(String(req.params.vaultId), parsed.data.date));
}
const previewFields = zod_1.z.object({
    projectId: zod_1.z.string().min(1),
    microserviceId: zod_1.z.string().min(1),
    environment: zod_1.z.string().min(1),
    reveal: zod_1.z.enum(['true', 'false']).optional(),
});
async function postPreviewUpdate(req, res) {
    const parsed = previewFields.safeParse(req.body);
    if (!parsed.success) {
        throw new errors_1.AppError('Project, microservice, and environment are required', 400, 'VALIDATION_ERROR');
    }
    const file = requireFile(req);
    const uploaded = (0, excelService_1.parseUpdateWorkbook)(file.buffer, file.originalname);
    const preview = await (0, vaultService_1.previewUpdate)({
        projectId: parsed.data.projectId,
        microserviceId: parsed.data.microserviceId,
        environment: parsed.data.environment,
        uploaded: uploaded.entries,
        reveal: parsed.data.reveal === 'true',
    });
    res.json(preview);
}
const updateFields = zod_1.z.object({
    vaultId: zod_1.z.string().min(1),
    baseVersion: zod_1.z.string().regex(/^\d+$/),
    previewToken: zod_1.z.string().regex(/^[a-f0-9]{64}$/i),
});
async function postVaultUpdate(req, res) {
    const parsed = updateFields.safeParse(req.body);
    if (!parsed.success) {
        throw new errors_1.AppError('Vault, base version, and preview token are required', 400, 'VALIDATION_ERROR');
    }
    const file = requireFile(req);
    const uploaded = (0, excelService_1.parseUpdateWorkbook)(file.buffer, file.originalname);
    const result = await (0, vaultService_1.applyVaultUpdate)({
        vaultId: parsed.data.vaultId,
        baseVersion: Number(parsed.data.baseVersion),
        previewToken: parsed.data.previewToken,
        uploaded: uploaded.entries,
        actorId: req.actor?.id,
    });
    res.status(result.updated ? 201 : 200).json(result);
}
