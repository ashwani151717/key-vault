"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_path_1 = __importDefault(require("node:path"));
const node_test_1 = require("node:test");
process.env.MONGOMS_DOWNLOAD_DIR = node_path_1.default.join(__dirname, '..', '.mongodb-binaries');
const mongoose_1 = __importDefault(require("mongoose"));
const mongodb_memory_server_1 = require("mongodb-memory-server");
const supertest_1 = __importDefault(require("supertest"));
const XLSX = __importStar(require("xlsx"));
const app_1 = require("../src/app");
const db_1 = require("../src/db");
const Vault_1 = require("../src/models/Vault");
const excelService_1 = require("../src/services/excelService");
const importService_1 = require("../src/services/importService");
const vaultService_1 = require("../src/services/vaultService");
const SECRET = 'example-password-not-real';
function workbook(sheets) {
    const book = XLSX.utils.book_new();
    for (const [name, rows] of Object.entries(sheets)) {
        XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), name);
    }
    return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });
}
const s6Headers = ['Sr. No.', 'MS Name', 'KeyVault Name', 'DEV1', 'DEV2', 'QA1', 'QA2', 'STAGE'];
const skyHeaders = ['Sr. No.', 'MS Name', 'KeyVault Name', 'DEV', 'QA', 'UAT', 'PREPROD', 'PREPROD CANARY'];
function inventoryFixture() {
    const nested = JSON.stringify({
        SERVICE_NAME: 'ms-gamma',
        ENABLED: true,
        RETRIES: 2,
        NOTE: null,
        FLAGS: { sms: true, channels: ['email'] },
        DB_PASSWORD: SECRET,
    });
    return workbook({
        s6web: [
            s6Headers,
            [1, 'ms-alpha', 'kv-alpha', nested, 'No KV', '', '{', 1],
            [2, 'ms-alpha', 'kv-alpha-dup', nested, '', '', '', ''],
            [3, 'ms-beta', 'kv-beta', '{"TOKEN":"one","TOKEN":"two"}', '', '', '', ''],
            [4, '', 'kv-missing', nested, '', '', '', ''],
            [5, 'ms-gamma', 'kv-gamma', nested, '', '', '', ''],
        ],
        skyplus: [
            skyHeaders,
            [1, 'ms-delta', 'kv-delta', JSON.stringify({ REGION: 'example', API_TOKEN: 'example-token-not-real' }), '', '', '', ''],
        ],
        notes: [['ignore']],
    });
}
(0, node_test_1.describe)('vault workflows', { timeout: 180000, concurrency: false }, () => {
    let replSet;
    (0, node_test_1.before)(async () => {
        replSet = await mongodb_memory_server_1.MongoMemoryReplSet.create({ replSet: { count: 1 } });
        process.env.MONGODB_URI = replSet.getUri();
        process.env.AUTH_REQUIRED = 'false';
        process.env.PREVIEW_SECRET = 'test-preview-secret';
        await (0, db_1.connectDb)(process.env.MONGODB_URI);
        await (0, db_1.ensureProjects)();
    }, { timeout: 180000 });
    (0, node_test_1.after)(async () => {
        await mongoose_1.default.disconnect();
        if (replSet)
            await replSet.stop();
    });
    async function reset() {
        await Vault_1.Vault.deleteMany({});
    }
    (0, node_test_1.it)('maps both workbook sheets and does not create vaults for invalid cells', async () => {
        await reset();
        const report = await (0, importService_1.importWorkbookBuffer)(inventoryFixture(), 'fixture.xlsx', 'tester');
        const imported = report.successful.map((row) => `${row.project}:${row.microservice}:${row.environment}`);
        strict_1.default.deepEqual(imported.sort(), ['S6Web:ms-alpha:DEV1', 'S6Web:ms-gamma:DEV1', 'SkyPlus:ms-delta:DEV'].sort());
        strict_1.default.ok(report.skipped.some((row) => row.environment === 'DEV2' && row.message === 'No KV'));
        strict_1.default.ok(report.skipped.some((row) => row.microservice === 'ms-alpha' && row.environment === 'QA1'));
        strict_1.default.ok(report.errors.some((row) => row.environment === 'QA2' && row.message === 'Invalid JSON'));
        strict_1.default.ok(report.errors.some((row) => row.environment === 'STAGE' && row.message === 'Configuration must be a JSON object'));
        strict_1.default.ok(report.duplicates.some((row) => row.microservice === 'ms-alpha' && row.row === 3));
        strict_1.default.ok(report.duplicates.some((row) => row.microservice === 'ms-beta' && row.message.includes('TOKEN')));
        strict_1.default.ok(report.errors.some((row) => row.message === 'Microservice name is missing'));
        strict_1.default.equal(report.errors.some((row) => row.sheet === 'notes'), true);
        const gamma = await (0, vaultService_1.resolveVault)({
            projectId: 's6web',
            microserviceId: 's6web::ms-gamma',
            environment: 'DEV1',
            reveal: true,
        });
        const flags = gamma.entries.find((entry) => entry.key === 'FLAGS');
        strict_1.default.deepEqual(flags?.value, { sms: true, channels: ['email'] });
        strict_1.default.equal(gamma.entries.find((entry) => entry.key === 'NOTE')?.value, null);
        strict_1.default.equal(gamma.entries.find((entry) => entry.key === 'DB_PASSWORD')?.value, SECRET);
        const betaVaults = await Vault_1.Vault.countDocuments({ microservice: 'ms-beta' });
        strict_1.default.equal(betaVaults, 0);
        const shown = await (0, vaultService_1.getVault)(gamma.vault.id, { reveal: false });
        strict_1.default.equal(shown.entries.find((entry) => entry.key === 'DB_PASSWORD')?.value, SECRET);
        strict_1.default.equal(shown.masked, false);
    });
    (0, node_test_1.it)('rejects a second import of the same vault without overwriting it', async () => {
        await reset();
        const first = await (0, importService_1.importWorkbookBuffer)(inventoryFixture(), 'fixture.xlsx', 'tester');
        const before = first.successful.length;
        strict_1.default.ok(before > 0);
        const second = await (0, importService_1.importWorkbookBuffer)(inventoryFixture(), 'fixture.xlsx', 'tester');
        strict_1.default.equal(second.successful.length, 0);
        strict_1.default.ok(second.duplicates.length >= before);
        const vaults = await Vault_1.Vault.find().lean();
        strict_1.default.equal(vaults.length, before);
        strict_1.default.ok(vaults.every((vault) => vault.version === 1 && vault.history.length === 0));
    });
    (0, node_test_1.it)('validates project environments', async () => {
        await strict_1.default.rejects(() => (0, vaultService_1.resolveVault)({
            projectId: 'skyplus',
            microserviceId: 'skyplus::ms-delta',
            environment: 'STAGE',
            reveal: false,
        }), /not a valid environment/);
    });
    (0, node_test_1.it)('applies a partial update, preserves absent keys, and skips no-op versions', async () => {
        const file = workbook({
            Vault: [
                ['Key', 'Value'],
                ['LOG_LEVEL', 'debug'],
                ['NEW_FLAG', true],
            ],
        });
        const uploaded = (0, excelService_1.parseUpdateWorkbook)(file, 'update.xlsx').entries;
        const preview = await (0, vaultService_1.previewUpdate)({
            projectId: 's6web',
            microserviceId: 's6web::ms-gamma',
            environment: 'DEV1',
            uploaded,
            reveal: true,
        });
        strict_1.default.equal(preview.summary.added, 2);
        strict_1.default.equal(preview.summary.updated, 0);
        strict_1.default.ok(preview.summary.preserved >= 1);
        strict_1.default.equal(preview.changes.find((row) => row.key === 'DB_PASSWORD'), undefined);
        const saved = await (0, vaultService_1.applyVaultUpdate)({
            vaultId: preview.vaultId,
            baseVersion: preview.baseVersion,
            previewToken: preview.previewToken,
            uploaded,
            actorId: 'tester',
        });
        strict_1.default.equal(saved.updated, true);
        strict_1.default.equal(saved.version, preview.baseVersion + 1);
        const latest = await (0, vaultService_1.getVault)(preview.vaultId, { reveal: true });
        strict_1.default.equal(latest.entries.find((entry) => entry.key === 'DB_PASSWORD')?.value, SECRET);
        strict_1.default.equal(latest.entries.find((entry) => entry.key === 'SERVICE_NAME')?.value, 'ms-gamma');
        strict_1.default.equal(latest.entries.find((entry) => entry.key === 'LOG_LEVEL')?.value, 'debug');
        strict_1.default.equal(latest.entries.find((entry) => entry.key === 'NEW_FLAG')?.value, true);
        const history = await (0, vaultService_1.getVault)(preview.vaultId, { version: preview.baseVersion, reveal: true });
        strict_1.default.equal(history.entries.find((entry) => entry.key === 'LOG_LEVEL')?.value, undefined);
        strict_1.default.equal(history.entries.find((entry) => entry.key === 'SERVICE_NAME')?.value, 'ms-gamma');
        strict_1.default.equal(history.entries.some((entry) => entry.key === 'NEW_FLAG'), false);
        const sameFile = workbook({
            Vault: [
                ['Key', 'Value'],
                ['LOG_LEVEL', 'debug'],
            ],
        });
        const sameEntries = (0, excelService_1.parseUpdateWorkbook)(sameFile, 'same.xlsx').entries;
        const samePreview = await (0, vaultService_1.previewUpdate)({
            projectId: 's6web',
            microserviceId: 's6web::ms-gamma',
            environment: 'DEV1',
            uploaded: sameEntries,
            reveal: false,
        });
        strict_1.default.equal(samePreview.hasChanges, false);
        const noop = await (0, vaultService_1.applyVaultUpdate)({
            vaultId: samePreview.vaultId,
            baseVersion: samePreview.baseVersion,
            previewToken: samePreview.previewToken,
            uploaded: sameEntries,
        });
        strict_1.default.equal(noop.updated, false);
        const savedDoc = await Vault_1.Vault.findById(preview.vaultId);
        strict_1.default.equal(savedDoc.history.length + 1, saved.version);
    });
    (0, node_test_1.it)('rejects duplicate keys and malformed update spreadsheets', async () => {
        const duplicate = workbook({
            Vault: [
                ['Key', 'Value'],
                ['LOG_LEVEL', 'debug'],
                ['LOG_LEVEL', 'warn'],
            ],
        });
        strict_1.default.throws(() => (0, excelService_1.parseUpdateWorkbook)(duplicate, 'dup.xlsx'), /Duplicate key/);
        const missing = workbook({
            Vault: [
                ['Name', 'Setting'],
                ['LOG_LEVEL', 'debug'],
            ],
        });
        strict_1.default.throws(() => (0, excelService_1.parseUpdateWorkbook)(missing, 'bad.xlsx'), /Key and Value/);
        const invalid = workbook({
            Vault: [
                ['Key', 'Value'],
                ['FLAGS', '{'],
            ],
        });
        strict_1.default.throws(() => (0, excelService_1.parseUpdateWorkbook)(invalid, 'bad-json.xlsx'), /Invalid JSON/);
        const before = await Vault_1.Vault.countDocuments({});
        strict_1.default.equal(await Vault_1.Vault.countDocuments({}), before);
    });
    (0, node_test_1.it)('returns the latest snapshot published on or before a date', async () => {
        const vault = await Vault_1.Vault.findOne({ microservice: 'ms-gamma', environment: 'DEV1' });
        strict_1.default.ok(vault);
        await Vault_1.Vault.updateOne({ _id: vault._id, 'history.version': 1 }, { $set: { 'history.$.savedAt': new Date('2020-01-15T10:00:00.000Z') } });
        const onDay = await (0, vaultService_1.getVersionByDate)(String(vault._id), '2020-01-15');
        strict_1.default.equal(onDay.versionNumber, 1);
        await strict_1.default.rejects(() => (0, vaultService_1.getVersionByDate)(String(vault._id), '2020-01-14'), /No version was published/);
        const later = await (0, vaultService_1.getVersionByDate)(String(vault._id), '2099-01-01');
        strict_1.default.equal(later.versionNumber, vault.version);
    });
    (0, node_test_1.it)('blocks a stale preview when another update wins', async () => {
        const firstFile = workbook({ Vault: [['Key', 'Value'], ['REGION', 'east']] });
        const secondFile = workbook({ Vault: [['Key', 'Value'], ['REGION', 'west']] });
        const first = (0, excelService_1.parseUpdateWorkbook)(firstFile, 'a.xlsx').entries;
        const second = (0, excelService_1.parseUpdateWorkbook)(secondFile, 'b.xlsx').entries;
        const previewA = await (0, vaultService_1.previewUpdate)({
            projectId: 'skyplus',
            microserviceId: 'skyplus::ms-delta',
            environment: 'DEV',
            uploaded: first,
            reveal: false,
        });
        const previewB = await (0, vaultService_1.previewUpdate)({
            projectId: 'skyplus',
            microserviceId: 'skyplus::ms-delta',
            environment: 'DEV',
            uploaded: second,
            reveal: false,
        });
        const results = await Promise.allSettled([
            (0, vaultService_1.applyVaultUpdate)({
                vaultId: previewA.vaultId,
                baseVersion: previewA.baseVersion,
                previewToken: previewA.previewToken,
                uploaded: first,
            }),
            (0, vaultService_1.applyVaultUpdate)({
                vaultId: previewB.vaultId,
                baseVersion: previewB.baseVersion,
                previewToken: previewB.previewToken,
                uploaded: second,
            }),
        ]);
        const fulfilled = results.filter((result) => result.status === 'fulfilled');
        const rejected = results.filter((result) => result.status === 'rejected');
        strict_1.default.equal(fulfilled.length, 1);
        strict_1.default.equal(rejected.length, 1);
        const updatedVault = await Vault_1.Vault.findById(previewA.vaultId);
        strict_1.default.equal(updatedVault.history.length + 1, previewA.baseVersion + 1);
    });
    (0, node_test_1.it)('rolls back the vault version when saving the snapshot fails', async () => {
        const vault = await Vault_1.Vault.findOne({ microservice: 'ms-gamma', environment: 'DEV1' });
        strict_1.default.ok(vault);
        const before = vault.version;
        const file = workbook({ Vault: [['Key', 'Value'], ['LOG_LEVEL', 'error']] });
        const uploaded = (0, excelService_1.parseUpdateWorkbook)(file, 'fail.xlsx').entries;
        const preview = await (0, vaultService_1.previewUpdate)({
            projectId: 's6web',
            microserviceId: 's6web::ms-gamma',
            environment: vault.environment,
            uploaded,
            reveal: false,
        });
        const original = vaultService_1.saveVaultVersion;
        vaultService_1.saveVaultVersion = (async () => {
            throw new Error('forced failure');
        });
        try {
            await strict_1.default.rejects(() => (0, vaultService_1.applyVaultUpdate)({
                vaultId: preview.vaultId,
                baseVersion: preview.baseVersion,
                previewToken: preview.previewToken,
                uploaded,
            }), /forced failure/);
        }
        finally {
            vaultService_1.saveVaultVersion = original;
        }
        const fresh = await Vault_1.Vault.findById(vault._id);
        strict_1.default.equal(fresh?.version, before);
        strict_1.default.equal(fresh.history.length + 1, before);
    });
    (0, node_test_1.it)('does not store secret values on audit events', async () => {
        const vault = await Vault_1.Vault.findOne({ microservice: 'ms-gamma', environment: 'DEV1' });
        await (0, vaultService_1.getVault)(String(vault._id), { reveal: true, actorId: 'auditor' });
        const fresh = await Vault_1.Vault.findById(vault._id).lean();
        strict_1.default.ok(fresh.activity.length > 0);
        strict_1.default.equal(JSON.stringify(fresh.activity).includes(SECRET), false);
    });
    (0, node_test_1.it)('serves the update template and a safe API error', async () => {
        const template = (0, excelService_1.buildUpdateTemplate)();
        const parsed = (0, excelService_1.parseUpdateWorkbook)(template, 'vault-update-template.xlsx');
        strict_1.default.deepEqual(parsed.entries.map((entry) => entry.key), ['LOG_LEVEL', 'RETRY_LIMIT', 'FEATURE_ENABLED', 'FEATURE_FLAGS', 'OPTIONAL_NOTE']);
        strict_1.default.equal(parsed.entries.find((entry) => entry.key === 'RETRY_LIMIT')?.value, 3);
        strict_1.default.deepEqual(parsed.entries.find((entry) => entry.key === 'FEATURE_FLAGS')?.value, { sms: false, email: true });
        const app = (0, app_1.createApp)();
        const response = await (0, supertest_1.default)(app).get('/api/projects/not-an-id/environments');
        strict_1.default.equal(response.status, 400);
        strict_1.default.equal(response.body.code, 'VALIDATION_ERROR');
        strict_1.default.equal(response.body.stack, undefined);
        strict_1.default.equal(JSON.stringify(response.body).includes(SECRET), false);
        const projects = await (0, supertest_1.default)(app).get('/api/projects');
        strict_1.default.equal(projects.status, 200);
        const names = projects.body.projects.map((project) => project.name).sort();
        strict_1.default.deepEqual(names, ['S6Web', 'SkyPlus']);
    });
});
