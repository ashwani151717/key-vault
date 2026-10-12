"use strict";
const projects = require("../constants/projects");
const errors = require("../lib/errors");
const entries = require("../lib/entries");
const objectId = require("../lib/objectId");
const previewToken = require("../lib/previewToken");
const sensitive = require("../lib/sensitive");
const Vault = require("../models/Vault").Vault;
const VERSION_CONFLICT = 'This vault was updated after the preview. Generate a new preview before saving.';
function projectFromId(projectId) {
    const project = projects.PROJECT_DEFINITIONS.find((item) => item.slug === projectId);
    if (!project)
        throw new errors.AppError('Project is invalid', 400, 'VALIDATION_ERROR');
    return project;
}
function microserviceKey(projectSlug, name) {
    return `${projectSlug}::${name}`;
}
function parseMicroserviceKey(value) {
    const splitAt = String(value || '').indexOf('::');
    if (splitAt <= 0)
        return null;
    const slug = value.slice(0, splitAt);
    const name = value.slice(splitAt + 2);
    if (!name)
        return null;
    return { slug, name };
}
function loadMapping(projectId, microserviceId, environment) {
    const project = projectFromId(projectId);
    const parsed = parseMicroserviceKey(microserviceId);
    if (!parsed || parsed.slug !== project.slug) {
        throw new errors.AppError('Microservice does not belong to the selected project', 400, 'INVALID_MAPPING');
    }
    if (!project.environments.includes(environment)) {
        throw new errors.AppError(`${environment} is not a valid environment for ${project.name}`, 400, 'INVALID_ENVIRONMENT');
    }
    return { project, microserviceName: parsed.name };
}
function assertVaultId(vaultId) {
    if (!objectId.isValidObjectId(vaultId)) {
        throw new errors.AppError('Vault is invalid', 400, 'VALIDATION_ERROR');
    }
}
function emptyChanges() {
    return { added: 0, updated: 0, unchanged: 0 };
}
function versionSnapshots(vault) {
    return [
        ...(vault.history || []).map((item) => ({
            versionNumber: item.version,
            savedAt: item.savedAt,
            updatedBy: item.updatedBy || undefined,
            changes: item.changes || emptyChanges(),
            value: item.value,
        })),
        {
            versionNumber: vault.version,
            savedAt: vault.updatedAt,
            updatedBy: vault.updatedBy || undefined,
            changes: vault.changes || emptyChanges(),
            value: vault.value,
        },
    ];
}
function presentSnapshot(vault, snapshot) {
    const project = projects.projectByNameOrSlug(vault.project);
    return {
        vault: {
            id: String(vault._id),
            project: { id: project?.slug || vault.project, name: vault.project },
            microservice: {
                id: microserviceKey(project?.slug || '', vault.microservice),
                name: vault.microservice,
            },
            environment: vault.environment,
            keyVaultName: '',
            version: snapshot.versionNumber,
            currentVersion: vault.version,
            updatedAt: vault.updatedAt.toISOString(),
            versionCreatedAt: new Date(snapshot.savedAt).toISOString(),
            isLatest: snapshot.versionNumber === vault.version,
            updatedBy: snapshot.updatedBy,
        },
        entries: entries.objectToEntries(snapshot.value).map((entry) => sensitive.presentValue(entry.key, entry.value)),
        masked: false,
    };
}
async function listProjects() {
    return projects.PROJECT_DEFINITIONS.map((project) => ({
        id: project.slug,
        name: project.name,
        slug: project.slug,
        environments: project.environments,
    })).sort((left, right) => left.name.localeCompare(right.name));
}
async function listEnvironments(projectId) {
    const project = projectFromId(projectId);
    return { projectId: project.slug, name: project.name, environments: project.environments };
}
async function listMicroservices(projectId, search) {
    const filter = {};
    if (projectId) {
        filter.project = projectFromId(projectId).name;
    }
    if (search && search.trim()) {
        const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.microservice = new RegExp(escaped, 'i');
    }
    const rows = await Vault.aggregate([
        { $match: filter },
        { $group: { _id: { project: '$project', microservice: '$microservice' } } },
        { $sort: { '_id.microservice': 1, '_id.project': 1 } },
        { $limit: 2000 },
    ]);
    return rows.map((row) => {
        const project = projects.projectByNameOrSlug(row._id.project);
        return {
            id: microserviceKey(project?.slug || '', row._id.microservice),
            name: row._id.microservice,
            description: '',
            projectId: project?.slug || '',
            projectName: row._id.project,
            projectSlug: project?.slug || '',
        };
    });
}
function endOfUtcDay(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new errors.AppError('Date must use YYYY-MM-DD', 400, 'VALIDATION_ERROR');
    }
    const parsed = new Date(`${date}T23:59:59.999Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
        throw new errors.AppError('Date is not a real calendar day', 400, 'VALIDATION_ERROR');
    }
    return parsed;
}
async function snapshotForVersion(vaultId, versionNumber) {
    const vault = await Vault.findById(vaultId);
    if (!vault)
        throw new errors.AppError('Vault not found', 404, 'NOT_FOUND');
    const snapshot = versionSnapshots(vault).find((item) => item.versionNumber === versionNumber);
    if (!snapshot)
        throw new errors.AppError('Version not found', 404, 'NOT_FOUND');
    return presentSnapshot(vault, snapshot);
}
async function resolveVault(input) {
    const { project, microserviceName } = loadMapping(input.projectId, input.microserviceId, input.environment);
    const vault = await Vault.findOne({
        project: project.name,
        microservice: microserviceName,
        environment: input.environment,
    });
    if (!vault) {
        throw new errors.AppError('No vault exists for this microservice, project, and environment', 404, 'NOT_FOUND');
    }
    if (input.version) {
        return snapshotForVersion(String(vault._id), input.version);
    }
    if (input.date) {
        const found = await getVersionByDate(String(vault._id), input.date);
        return snapshotForVersion(String(vault._id), found.versionNumber);
    }
    return snapshotForVersion(String(vault._id), vault.version);
}
async function getVault(vaultId, options) {
    assertVaultId(vaultId);
    const vault = await Vault.findById(vaultId);
    if (!vault)
        throw new errors.AppError('Vault not found', 404, 'NOT_FOUND');
    return snapshotForVersion(vaultId, options.version || vault.version);
}
async function listVersions(vaultId) {
    assertVaultId(vaultId);
    const vault = await Vault.findById(vaultId).lean();
    if (!vault)
        throw new errors.AppError('Vault not found', 404, 'NOT_FOUND');
    return versionSnapshots(vault)
        .sort((left, right) => right.versionNumber - left.versionNumber)
        .map((version) => ({
        versionNumber: version.versionNumber,
        createdAt: new Date(version.savedAt).toISOString(),
        updatedBy: version.updatedBy,
        changeSummary: version.changes,
        isLatest: version.versionNumber === vault.version,
    }));
}
async function getVersionByDate(vaultId, date) {
    assertVaultId(vaultId);
    const vault = await Vault.findById(vaultId).lean();
    if (!vault)
        throw new errors.AppError('Vault not found', 404, 'NOT_FOUND');
    const end = endOfUtcDay(date);
    const match = versionSnapshots(vault)
        .filter((version) => new Date(version.savedAt).getTime() <= end.getTime())
        .sort((left, right) => right.versionNumber - left.versionNumber)[0];
    if (!match) {
        throw new errors.AppError('No version was published on or before that date', 404, 'NOT_FOUND');
    }
    return {
        versionNumber: match.versionNumber,
        createdAt: new Date(match.savedAt).toISOString(),
        updatedBy: match.updatedBy,
        changeSummary: match.changes,
        isLatest: match.versionNumber === vault.version,
    };
}
function presentChange(change) {
    const current = change.hasCurrent ? sensitive.presentValue(change.key, change.currentValue) : null;
    const uploaded = sensitive.presentValue(change.key, change.uploadedValue);
    return {
        key: change.key,
        hasCurrent: change.hasCurrent,
        currentValue: current ? current.value : null,
        uploadedValue: uploaded.value,
        action: change.action,
        sensitive: uploaded.sensitive,
        redacted: uploaded.redacted || Boolean(current?.redacted),
        valueType: uploaded.valueType,
    };
}
async function findVaultForUpdate(input) {
    const { project, microserviceName } = loadMapping(input.projectId, input.microserviceId, input.environment);
    const vault = await Vault.findOne({
        project: project.name,
        microservice: microserviceName,
        environment: input.environment,
    });
    if (!vault) {
        throw new errors.AppError('No vault exists for this microservice, project, and environment', 404, 'NOT_FOUND');
    }
    return vault;
}
async function previewUpdate(input) {
    const vault = await findVaultForUpdate(input);
    const merged = entries.mergeEntries(entries.objectToEntries(vault.value), input.uploaded);
    const token = previewToken.signPreview({
        vaultId: String(vault._id),
        baseVersion: vault.version,
        uploaded: input.uploaded,
    });
    return {
        vaultId: String(vault._id),
        baseVersion: vault.version,
        previewToken: token,
        keyVaultName: '',
        summary: {
            added: merged.added,
            updated: merged.updated,
            unchanged: merged.unchanged,
            preserved: merged.preserved,
        },
        hasChanges: merged.added > 0 || merged.updated > 0,
        changes: merged.changes.map((change) => presentChange(change)),
        masked: false,
    };
}
async function saveVaultVersion(input) {
    const claimed = await Vault.findOneAndUpdate({ _id: input.vaultId, version: input.baseVersion }, {
        $set: {
            version: input.nextVersion,
            value: input.value,
            updatedBy: input.actorId || '',
            changes: input.changes,
        },
        $push: {
            history: {
                version: input.baseVersion,
                value: input.previousValue,
                savedAt: input.previousSavedAt,
                updatedBy: input.previousUpdatedBy || '',
                changes: input.previousChanges || emptyChanges(),
            },
            activity: {
                action: 'update',
                version: input.nextVersion,
                savedAt: new Date(),
                by: input.actorId || '',
                added: input.changes.added,
                updated: input.changes.updated,
                unchanged: input.changes.unchanged,
            },
        },
    }, { new: true });
    if (!claimed)
        throw new errors.AppError(VERSION_CONFLICT, 409, 'VERSION_CONFLICT');
    return claimed;
}
async function applyVaultUpdate(input) {
    assertVaultId(input.vaultId);
    if (!Number.isInteger(input.baseVersion) || input.baseVersion < 1) {
        throw new errors.AppError('Base version is invalid', 400, 'VALIDATION_ERROR');
    }
    const vault = await Vault.findById(input.vaultId);
    if (!vault)
        throw new errors.AppError('Vault not found', 404, 'NOT_FOUND');
    if (vault.version !== input.baseVersion) {
        throw new errors.AppError(VERSION_CONFLICT, 409, 'VERSION_CONFLICT');
    }
    const tokenMatches = previewToken.verifyPreview({ vaultId: String(vault._id), baseVersion: input.baseVersion, uploaded: input.uploaded }, input.previewToken);
    if (!tokenMatches) {
        throw new errors.AppError('Preview does not match this file. Generate a new preview before saving.', 409, 'PREVIEW_MISMATCH');
    }
    const merged = entries.mergeEntries(entries.objectToEntries(vault.value), input.uploaded);
    if (merged.added === 0 && merged.updated === 0) {
        return {
            updated: false,
            vaultId: String(vault._id),
            version: vault.version,
            summary: {
                added: 0,
                updated: 0,
                unchanged: merged.unchanged,
                preserved: merged.preserved,
            },
            message: 'No changes detected. A new version was not created.',
        };
    }
    await exports.saveVaultVersion({
        vaultId: vault._id,
        baseVersion: input.baseVersion,
        nextVersion: input.baseVersion + 1,
        value: entries.valueFromEntries(merged.entries),
        previousValue: JSON.parse(JSON.stringify(vault.value)),
        previousSavedAt: vault.updatedAt,
        previousUpdatedBy: vault.updatedBy,
        previousChanges: vault.changes,
        actorId: input.actorId,
        changes: { added: merged.added, updated: merged.updated, unchanged: merged.unchanged },
    });
    return {
        updated: true,
        vaultId: String(vault._id),
        version: input.baseVersion + 1,
        summary: {
            added: merged.added,
            updated: merged.updated,
            unchanged: merged.unchanged,
            preserved: merged.preserved,
        },
        message: 'Vault updated. A new immutable version was created.',
    };
}
exports.listProjects = listProjects;
exports.listEnvironments = listEnvironments;
exports.listMicroservices = listMicroservices;
exports.resolveVault = resolveVault;
exports.getVault = getVault;
exports.listVersions = listVersions;
exports.getVersionByDate = getVersionByDate;
exports.previewUpdate = previewUpdate;
exports.applyVaultUpdate = applyVaultUpdate;
exports.saveVaultVersion = saveVaultVersion;
