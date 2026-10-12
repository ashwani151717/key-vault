"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signPreview = signPreview;
exports.verifyPreview = verifyPreview;
const crypto_1 = require("crypto");
const config_1 = require("../config");
const entries_1 = require("./entries");
function digest(stamp) {
    const body = `${stamp.vaultId}|${stamp.baseVersion}|${(0, entries_1.canonicalEntries)(stamp.uploaded)}`;
    return (0, crypto_1.createHmac)('sha256', (0, config_1.getConfig)().previewSecret).update(body).digest('hex');
}
function signPreview(stamp) {
    return digest(stamp);
}
function verifyPreview(stamp, token) {
    if (!/^[a-f0-9]{64}$/i.test(token))
        return false;
    const expected = Buffer.from(digest(stamp), 'hex');
    const actual = Buffer.from(token, 'hex');
    if (expected.length !== actual.length)
        return false;
    return (0, crypto_1.timingSafeEqual)(expected, actual);
}
