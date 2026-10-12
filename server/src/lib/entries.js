"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stableStringify = stableStringify;
exports.valuesEqual = valuesEqual;
exports.toEntries = toEntries;
exports.objectToEntries = objectToEntries;
exports.valueFromEntries = valueFromEntries;
exports.canonicalEntries = canonicalEntries;
exports.mergeEntries = mergeEntries;
function stableStringify(value) {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(',')}]`;
    }
    const record = value;
    const keys = Object.keys(record).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}
function valuesEqual(left, right) {
    return stableStringify(left) === stableStringify(right);
}
function toEntries(entries) {
    return entries.map((entry) => ({
        key: entry.key,
        value: entry.value === undefined ? null : entry.value,
    }));
}
function objectToEntries(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return [];
    return Object.keys(value).map((key) => ({ key, value: value[key] }));
}
function valueFromEntries(entries) {
    const value = {};
    for (const entry of entries) {
        value[entry.key] = entry.value === undefined ? null : entry.value;
    }
    return value;
}
function canonicalEntries(entries) {
    return entries
        .slice()
        .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
        .map((entry) => `${JSON.stringify(entry.key)}=${stableStringify(entry.value)}`)
        .join('\n');
}
/**
 * Partial merge: uploaded keys are added or replaced.
 * Keys absent from the upload stay in place and are never deleted.
 */
function mergeEntries(current, uploaded) {
    const uploadMap = new Map();
    for (const entry of uploaded) {
        uploadMap.set(entry.key, entry.value);
    }
    let updated = 0;
    let unchanged = 0;
    const changeByKey = new Map();
    const next = current.map((entry) => {
        if (!uploadMap.has(entry.key)) {
            return { key: entry.key, value: entry.value };
        }
        const uploadedValue = uploadMap.get(entry.key);
        if (valuesEqual(entry.value, uploadedValue)) {
            unchanged += 1;
            changeByKey.set(entry.key, {
                key: entry.key,
                hasCurrent: true,
                currentValue: entry.value,
                uploadedValue,
                action: 'unchanged',
            });
            return { key: entry.key, value: entry.value };
        }
        updated += 1;
        changeByKey.set(entry.key, {
            key: entry.key,
            hasCurrent: true,
            currentValue: entry.value,
            uploadedValue,
            action: 'updated',
        });
        return { key: entry.key, value: uploadedValue };
    });
    let added = 0;
    const currentKeys = new Set(current.map((entry) => entry.key));
    for (const entry of uploaded) {
        if (currentKeys.has(entry.key))
            continue;
        added += 1;
        changeByKey.set(entry.key, {
            key: entry.key,
            hasCurrent: false,
            currentValue: null,
            uploadedValue: entry.value,
            action: 'added',
        });
        next.push({ key: entry.key, value: entry.value });
    }
    const changes = uploaded.map((entry) => changeByKey.get(entry.key)).filter((row) => Boolean(row));
    const preserved = current.filter((entry) => !uploadMap.has(entry.key)).length;
    return { entries: next, added, updated, unchanged, preserved, changes };
}
