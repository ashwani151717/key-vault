"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REDACTED = void 0;
exports.isSensitiveKey = isSensitiveKey;
exports.valueType = valueType;
exports.presentValue = presentValue;
const SENSITIVE_KEY = /(pass(word|wd)?|secret|token|api[-_]?key|access[-_]?key|private[-_]?key|credential|connection[-_]?string|client[-_]?secret|sas[-_]?key|authorization|signing[-_]?key)/i;
exports.REDACTED = '••••••••';
function isSensitiveKey(key) {
    return SENSITIVE_KEY.test(key);
}
function valueType(value) {
    if (value === null)
        return 'null';
    if (Array.isArray(value))
        return 'array';
    return typeof value;
}
function presentValue(key, value) {
    return {
        key,
        value,
        sensitive: isSensitiveKey(key),
        redacted: false,
        valueType: valueType(value),
    };
}
