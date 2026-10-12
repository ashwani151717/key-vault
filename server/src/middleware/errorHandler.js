"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = asyncHandler;
exports.notFoundHandler = notFoundHandler;
exports.errorHandler = errorHandler;
const multer_1 = __importDefault(require("multer"));
const zod_1 = require("zod");
const errors_1 = require("../lib/errors");
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
function notFoundHandler(req, res) {
    res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
}
function errorHandler(error, req, res, _next) {
    if (error instanceof multer_1.default.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({ error: 'File exceeds the upload size limit', code: 'FILE_TOO_LARGE' });
            return;
        }
        res.status(400).json({ error: 'Upload was rejected', code: 'UPLOAD_REJECTED' });
        return;
    }
    if (error instanceof zod_1.ZodError) {
        const message = error.issues.map((issue) => `${issue.path.join('.') || 'value'}: ${issue.message}`).join('; ');
        res.status(400).json({ error: message, code: 'VALIDATION_ERROR' });
        return;
    }
    if ((0, errors_1.isAppError)(error)) {
        res.status(error.status).json({ error: error.message, code: error.code });
        return;
    }
    const code = error instanceof Error ? error.name : 'Error';
    console.error(`Request failed: ${req.method} ${req.path} (${code})`);
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
}
