"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findDuplicateKeys = findDuplicateKeys;
exports.parseConfigurationCell = parseConfigurationCell;
exports.parseUpdateCellValue = parseUpdateCellValue;
/**
 * Walk JSON text and report object keys that appear more than once at the same level.
 * JSON.parse keeps the last duplicate and would hide the collision.
 */
function findDuplicateKeys(json) {
    const duplicates = [];
    let index = 0;
    const length = json.length;
    function skipWhitespace() {
        while (index < length && /\s/.test(json[index]))
            index += 1;
    }
    function parseString() {
        if (json[index] !== '"')
            throw new Error('Invalid JSON');
        index += 1;
        let out = '';
        while (index < length) {
            const char = json[index];
            index += 1;
            if (char === '"')
                return out;
            if (char === '\\') {
                const escaped = json[index];
                index += 1;
                if (escaped === undefined)
                    throw new Error('Invalid JSON');
                if (escaped === 'u') {
                    const hex = json.slice(index, index + 4);
                    if (!/^[0-9a-fA-F]{4}$/.test(hex))
                        throw new Error('Invalid JSON');
                    out += String.fromCharCode(parseInt(hex, 16));
                    index += 4;
                    continue;
                }
                const simple = {
                    '"': '"',
                    '\\': '\\',
                    '/': '/',
                    b: '\b',
                    f: '\f',
                    n: '\n',
                    r: '\r',
                    t: '\t',
                };
                out += simple[escaped] ?? escaped;
                continue;
            }
            out += char;
        }
        throw new Error('Invalid JSON');
    }
    function skipLiteral() {
        if (json.startsWith('true', index)) {
            index += 4;
            return;
        }
        if (json.startsWith('false', index)) {
            index += 5;
            return;
        }
        if (json.startsWith('null', index)) {
            index += 4;
            return;
        }
        const start = index;
        if (json[index] === '-')
            index += 1;
        while (index < length && /[0-9]/.test(json[index]))
            index += 1;
        if (json[index] === '.') {
            index += 1;
            while (index < length && /[0-9]/.test(json[index]))
                index += 1;
        }
        if (json[index] === 'e' || json[index] === 'E') {
            index += 1;
            if (json[index] === '+' || json[index] === '-')
                index += 1;
            while (index < length && /[0-9]/.test(json[index]))
                index += 1;
        }
        if (index === start)
            throw new Error('Invalid JSON');
    }
    function parseValue() {
        skipWhitespace();
        const char = json[index];
        if (char === '{') {
            parseObject();
            return;
        }
        if (char === '[') {
            parseArray();
            return;
        }
        if (char === '"') {
            parseString();
            return;
        }
        skipLiteral();
    }
    function parseObject() {
        index += 1;
        const seen = new Set();
        skipWhitespace();
        if (json[index] === '}') {
            index += 1;
            return;
        }
        while (index < length) {
            skipWhitespace();
            const key = parseString();
            if (seen.has(key))
                duplicates.push(key);
            seen.add(key);
            skipWhitespace();
            if (json[index] !== ':')
                throw new Error('Invalid JSON');
            index += 1;
            parseValue();
            skipWhitespace();
            if (json[index] === ',') {
                index += 1;
                continue;
            }
            if (json[index] === '}') {
                index += 1;
                return;
            }
            throw new Error('Invalid JSON');
        }
        throw new Error('Invalid JSON');
    }
    function parseArray() {
        index += 1;
        skipWhitespace();
        if (json[index] === ']') {
            index += 1;
            return;
        }
        while (index < length) {
            parseValue();
            skipWhitespace();
            if (json[index] === ',') {
                index += 1;
                continue;
            }
            if (json[index] === ']') {
                index += 1;
                return;
            }
            throw new Error('Invalid JSON');
        }
        throw new Error('Invalid JSON');
    }
    parseValue();
    skipWhitespace();
    if (index !== length)
        throw new Error('Invalid JSON');
    return duplicates;
}
function parseConfigurationCell(raw) {
    if (raw === null || raw === undefined)
        return { ok: false, reason: 'empty', message: 'Empty cell' };
    if (typeof raw === 'number' || typeof raw === 'boolean') {
        return { ok: false, reason: 'not_object', message: 'Configuration must be a JSON object' };
    }
    const text = String(raw).replace(/^\uFEFF/, '').replace(/\u00a0/g, ' ').trim();
    if (!text)
        return { ok: false, reason: 'empty', message: 'Empty cell' };
    if (/^no\s*kv$/i.test(text))
        return { ok: false, reason: 'no_kv', message: 'No KV' };
    let parsed;
    try {
        parsed = JSON.parse(text);
    }
    catch {
        return { ok: false, reason: 'invalid_json', message: 'Invalid JSON' };
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { ok: false, reason: 'not_object', message: 'Configuration must be a JSON object' };
    }
    let duplicateKeys = [];
    try {
        duplicateKeys = findDuplicateKeys(text);
    }
    catch {
        return { ok: false, reason: 'invalid_json', message: 'Invalid JSON' };
    }
    if (duplicateKeys.length > 0) {
        const unique = [...new Set(duplicateKeys)];
        return {
            ok: false,
            reason: 'duplicate_keys',
            message: `Duplicate keys in configuration: ${unique.join(', ')}`,
            keys: unique,
        };
    }
    const entries = Object.keys(parsed).map((key) => ({
        key,
        value: parsed[key],
    }));
    return { ok: true, entries };
}
function parseUpdateCellValue(cellType, raw) {
    if (raw === null || raw === undefined || raw === '') {
        return { ok: true, value: '' };
    }
    if (cellType === 'd') {
        return { ok: false, message: 'Dates are not supported. Use a string, number, boolean, or JSON value.' };
    }
    if (cellType === 'n' || typeof raw === 'number') {
        if (typeof raw !== 'number' || !Number.isFinite(raw)) {
            return { ok: false, message: 'Numeric value is not finite' };
        }
        return { ok: true, value: raw };
    }
    if (cellType === 'b' || typeof raw === 'boolean') {
        return { ok: true, value: Boolean(raw) };
    }
    const text = String(raw);
    const trimmed = text.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            const parsed = JSON.parse(trimmed);
            if (parsed === null || typeof parsed !== 'object') {
                return { ok: false, message: 'JSON value must be an object or array' };
            }
            try {
                const duplicates = findDuplicateKeys(trimmed);
                if (duplicates.length > 0) {
                    return { ok: false, message: `Duplicate keys in JSON value: ${[...new Set(duplicates)].join(', ')}` };
                }
            }
            catch {
                return { ok: false, message: 'Invalid JSON value' };
            }
            return { ok: true, value: parsed };
        }
        catch {
            return { ok: false, message: 'Invalid JSON value' };
        }
    }
    if (trimmed === 'null')
        return { ok: true, value: null };
    if (trimmed === 'true')
        return { ok: true, value: true };
    if (trimmed === 'false')
        return { ok: true, value: false };
    return { ok: true, value: trimmed };
}
