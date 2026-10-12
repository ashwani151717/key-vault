"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const entries_1 = require("../src/lib/entries");
const jsonConfig_1 = require("../src/lib/jsonConfig");
const sensitive_1 = require("../src/lib/sensitive");
(0, node_test_1.describe)('JSON configuration parsing', () => {
    (0, node_test_1.it)('preserves nested objects, arrays, strings, numbers, booleans, and null', () => {
        const parsed = (0, jsonConfig_1.parseConfigurationCell)(JSON.stringify({
            NAME: 'boarding',
            ENABLED: true,
            RETRIES: 2,
            NOTE: null,
            FLAGS: { sms: false, channels: ['email', 1] },
        }));
        strict_1.default.equal(parsed.ok, true);
        if (!parsed.ok)
            return;
        const flags = parsed.entries.find((entry) => entry.key === 'FLAGS');
        strict_1.default.deepEqual(flags?.value, { sms: false, channels: ['email', 1] });
        strict_1.default.equal(parsed.entries.find((entry) => entry.key === 'NOTE')?.value, null);
        strict_1.default.equal(parsed.entries.find((entry) => entry.key === 'RETRIES')?.value, 2);
        strict_1.default.equal(parsed.entries.find((entry) => entry.key === 'ENABLED')?.value, true);
    });
    (0, node_test_1.it)('reports invalid JSON without treating it as an empty vault', () => {
        const parsed = (0, jsonConfig_1.parseConfigurationCell)('{ "NAME": ');
        strict_1.default.equal(parsed.ok, false);
        if (parsed.ok)
            return;
        strict_1.default.equal(parsed.reason, 'invalid_json');
        strict_1.default.equal(parsed.message.includes('{'), false);
    });
    (0, node_test_1.it)('reports duplicate keys instead of keeping the last value', () => {
        const parsed = (0, jsonConfig_1.parseConfigurationCell)('{"TOKEN":"one","TOKEN":"two","NAME":"svc"}');
        strict_1.default.equal(parsed.ok, false);
        if (parsed.ok)
            return;
        strict_1.default.equal(parsed.reason, 'duplicate_keys');
        strict_1.default.deepEqual(parsed.keys, ['TOKEN']);
    });
    (0, node_test_1.it)('detects duplicates only within the same object', () => {
        strict_1.default.deepEqual((0, jsonConfig_1.findDuplicateKeys)('{"a":{"b":1},"c":{"b":2}}'), []);
    });
    (0, node_test_1.it)('classifies blank cells and No KV separately from invalid configuration', () => {
        strict_1.default.equal((0, jsonConfig_1.parseConfigurationCell)('').reason, 'empty');
        strict_1.default.equal((0, jsonConfig_1.parseConfigurationCell)('  No KV  ').reason, 'no_kv');
        strict_1.default.equal((0, jsonConfig_1.parseConfigurationCell)(42).reason, 'not_object');
        strict_1.default.equal((0, jsonConfig_1.parseConfigurationCell)('[1,2]').reason, 'not_object');
    });
    (0, node_test_1.it)('parses update values by Excel type and rejects broken JSON', () => {
        strict_1.default.deepEqual((0, jsonConfig_1.parseUpdateCellValue)('n', 3), { ok: true, value: 3 });
        strict_1.default.deepEqual((0, jsonConfig_1.parseUpdateCellValue)('b', true), { ok: true, value: true });
        strict_1.default.deepEqual((0, jsonConfig_1.parseUpdateCellValue)('s', 'plain-text'), { ok: true, value: 'plain-text' });
        strict_1.default.deepEqual((0, jsonConfig_1.parseUpdateCellValue)('s', '007'), { ok: true, value: '007' });
        strict_1.default.deepEqual((0, jsonConfig_1.parseUpdateCellValue)('s', 'null'), { ok: true, value: null });
        strict_1.default.deepEqual((0, jsonConfig_1.parseUpdateCellValue)('s', '{"on":true}'), { ok: true, value: { on: true } });
        const invalid = (0, jsonConfig_1.parseUpdateCellValue)('s', '{not json');
        strict_1.default.equal(invalid.ok, false);
    });
    (0, node_test_1.it)('masks keys that look like credentials', () => {
        strict_1.default.equal((0, sensitive_1.isSensitiveKey)('DB_PASSWORD'), true);
        strict_1.default.equal((0, sensitive_1.isSensitiveKey)('API_TOKEN'), true);
        strict_1.default.equal((0, sensitive_1.isSensitiveKey)('LOG_LEVEL'), false);
        strict_1.default.equal((0, sensitive_1.isSensitiveKey)('SERVICE_NAME'), false);
    });
});
(0, node_test_1.describe)('partial merge', () => {
    const current = [
        { key: 'KEEP_ME', value: 'stay' },
        { key: 'LOG_LEVEL', value: 'info' },
        { key: 'DB_PASSWORD', value: 'example-password-not-real' },
    ];
    (0, node_test_1.it)('adds and updates uploaded keys and preserves absent keys', () => {
        const merged = (0, entries_1.mergeEntries)(current, [
            { key: 'LOG_LEVEL', value: 'debug' },
            { key: 'NEW_FLAG', value: true },
        ]);
        strict_1.default.equal(merged.added, 1);
        strict_1.default.equal(merged.updated, 1);
        strict_1.default.equal(merged.unchanged, 0);
        strict_1.default.equal(merged.preserved, 2);
        strict_1.default.deepEqual(merged.entries.map((entry) => entry.key), ['KEEP_ME', 'LOG_LEVEL', 'DB_PASSWORD', 'NEW_FLAG']);
        strict_1.default.equal(merged.entries.find((entry) => entry.key === 'DB_PASSWORD')?.value, 'example-password-not-real');
        strict_1.default.equal(merged.entries.find((entry) => entry.key === 'LOG_LEVEL')?.value, 'debug');
    });
    (0, node_test_1.it)('counts identical uploads as unchanged', () => {
        const merged = (0, entries_1.mergeEntries)(current, [{ key: 'LOG_LEVEL', value: 'info' }]);
        strict_1.default.equal(merged.added, 0);
        strict_1.default.equal(merged.updated, 0);
        strict_1.default.equal(merged.unchanged, 1);
        strict_1.default.equal(merged.entries.length, current.length);
    });
    (0, node_test_1.it)('treats reordered object keys as the same value', () => {
        const merged = (0, entries_1.mergeEntries)([{ key: 'FLAGS', value: { b: 1, a: 2 } }], [{ key: 'FLAGS', value: { a: 2, b: 1 } }]);
        strict_1.default.equal(merged.updated, 0);
        strict_1.default.equal(merged.unchanged, 1);
    });
});
