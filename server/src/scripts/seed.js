"use strict";
const mongoose = require("mongoose");
const db = require("../db");
const entries = require("../lib/entries");
const Vault = require("../models/Vault").Vault;
const SAMPLE_PASSWORD = 'example-password-not-real';
const SAMPLE_TOKEN = 'example-token-not-real';
async function ensureVault(input) {
    const existing = await Vault.findOne({
        project: input.project,
        microservice: input.microservice,
        environment: input.environment,
    });
    if (existing)
        return existing;
    const versions = input.versions;
    const current = versions[versions.length - 1];
    const history = versions.slice(0, -1).map((version, index) => ({
        version: index + 1,
        value: entries.valueFromEntries(version.entries),
        savedAt: version.createdAt,
        updatedBy: version.updatedBy,
        changes: { added: version.added, updated: version.updated, unchanged: 0 },
    }));
    return Vault.create({
        project: input.project,
        microservice: input.microservice,
        environment: input.environment,
        version: versions.length,
        value: entries.valueFromEntries(current.entries),
        updatedBy: current.updatedBy,
        changes: { added: current.added, updated: current.updated, unchanged: 0 },
        history,
        activity: versions.map((version, index) => ({
            action: index === 0 ? 'import' : 'update',
            version: index + 1,
            savedAt: version.createdAt,
            by: version.updatedBy,
            added: version.added,
            updated: version.updated,
            unchanged: 0,
        })),
        createdAt: versions[0].createdAt,
        updatedAt: current.createdAt,
    });
}
async function main() {
    await db.connectDb();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const baseEntries = [
        { key: 'SERVICE_NAME', value: 'ms-boarding-pass' },
        { key: 'LOG_LEVEL', value: 'info' },
        { key: 'RETRY_LIMIT', value: 3 },
        { key: 'FEATURE_ENABLED', value: true },
        { key: 'OPTIONAL_NOTE', value: null },
        { key: 'UPSTREAMS', value: ['alpha', 'beta'] },
        { key: 'FEATURE_FLAGS', value: { sms: true, email: false } },
        { key: 'DB_PASSWORD', value: SAMPLE_PASSWORD },
        { key: 'API_TOKEN', value: SAMPLE_TOKEN },
    ];
    const nextEntries = baseEntries.map((entry) => entry.key === 'LOG_LEVEL' ? { key: 'LOG_LEVEL', value: 'debug' } : entry);
    nextEntries.push({ key: 'NEW_FLAG', value: 'enabled' });
    await ensureVault({
        project: 'S6Web',
        microservice: 'ms-boarding-pass',
        environment: 'DEV1',
        versions: [
            { createdAt: yesterday, entries: baseEntries, updatedBy: 'seed', added: baseEntries.length, updated: 0 },
            { createdAt: new Date(), entries: nextEntries, updatedBy: 'seed', added: 1, updated: 1 },
        ],
    });
    await ensureVault({
        project: 'S6Web',
        microservice: 'ms-check-in',
        environment: 'QA1',
        versions: [{
                createdAt: new Date(),
                entries: [
                    { key: 'SERVICE_NAME', value: 'ms-check-in' },
                    { key: 'LOG_LEVEL', value: 'warn' },
                    { key: 'DB_PASSWORD', value: SAMPLE_PASSWORD },
                ],
                updatedBy: 'seed',
                added: 3,
                updated: 0,
            }],
    });
    await ensureVault({
        project: 'SkyPlus',
        microservice: 'ms-booking',
        environment: 'DEV',
        versions: [{
                createdAt: new Date(),
                entries: [
                    { key: 'SERVICE_NAME', value: 'ms-booking' },
                    { key: 'REGION', value: 'example-region' },
                    { key: 'LIMITS', value: { timeoutMs: 1500, retries: 2 } },
                    { key: 'API_TOKEN', value: SAMPLE_TOKEN },
                ],
                updatedBy: 'seed',
                added: 4,
                updated: 0,
            }],
    });
    await ensureVault({
        project: 'SkyPlus',
        microservice: 'ms-payment',
        environment: 'PREPROD CANARY',
        versions: [{
                createdAt: new Date(),
                entries: [
                    { key: 'SERVICE_NAME', value: 'ms-payment' },
                    { key: 'PROVIDER', value: 'example-provider' },
                    { key: 'CLIENT_SECRET', value: 'example-client-secret-not-real' },
                ],
                updatedBy: 'seed',
                added: 3,
                updated: 0,
            }],
    });
    console.log('Seeded fictional vault snapshots.');
    await mongoose.disconnect();
}
main().catch(async (error) => {
    const message = error instanceof Error ? error.message : 'Seed failed';
    console.error(message);
    await mongoose.disconnect().catch(() => undefined);
    process.exit(1);
});
