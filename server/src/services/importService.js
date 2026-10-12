"use strict";
const entries = require("../lib/entries");
const Vault = require("../models/Vault");
const excelService = require("./excelService");
async function createVaultSnapshot(plan, actorId) {
    const existing = await Vault.Vault.findOne({
        project: plan.projectName,
        microservice: plan.microserviceName,
        environment: plan.environment,
    });
    if (existing) {
        return {
            status: 'duplicate',
            message: 'A vault already exists for this microservice and environment. Existing data was left unchanged.',
        };
    }
    const value = entries.valueFromEntries(plan.entries);
    const savedAt = new Date();
    try {
        await Vault.Vault.create({
            project: plan.projectName,
            microservice: plan.microserviceName,
            environment: plan.environment,
            version: 1,
            value,
            updatedBy: actorId,
            changes: { added: plan.entries.length, updated: 0, unchanged: 0 },
            history: [],
            activity: [{
                    action: 'import',
                    version: 1,
                    savedAt,
                    by: actorId,
                    added: plan.entries.length,
                    updated: 0,
                    unchanged: 0,
                }],
        });
    }
    catch (error) {
        if (isDuplicateKey(error)) {
            return {
                status: 'duplicate',
                message: 'A vault already exists for this microservice and environment. Existing data was left unchanged.',
            };
        }
        throw error;
    }
    return { status: 'created' };
}
function isDuplicateKey(error) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}
async function importWorkbookBuffer(buffer, filename, actorId) {
    const parsed = excelService.parseInventoryWorkbook(buffer, filename);
    const report = {
        successful: [],
        skipped: parsed.skipped,
        errors: parsed.errors,
        duplicates: parsed.duplicates,
    };
    for (const plan of parsed.planned) {
        const result = await createVaultSnapshot(plan, actorId);
        if (result.status === 'created') {
            report.successful.push({
                sheet: plan.sheet,
                row: plan.row,
                project: plan.projectName,
                microservice: plan.microserviceName,
                environment: plan.environment,
                keyVaultName: plan.keyVaultName,
                keyCount: plan.entries.length,
                version: 1,
            });
            continue;
        }
        if (result.status === 'duplicate') {
            report.duplicates.push({
                sheet: plan.sheet,
                row: plan.row,
                microservice: plan.microserviceName,
                environment: plan.environment,
                message: result.message,
            });
            continue;
        }
        report.errors.push({
            sheet: plan.sheet,
            row: plan.row,
            microservice: plan.microserviceName,
            environment: plan.environment,
            message: result.message,
        });
    }
    return report;
}
exports.importWorkbookBuffer = importWorkbookBuffer;
