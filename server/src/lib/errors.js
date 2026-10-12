"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.isAppError = isAppError;
class AppError extends Error {
    status;
    code;
    constructor(message, status = 500, code = 'INTERNAL_ERROR') {
        super(message);
        this.name = 'AppError';
        this.status = status;
        this.code = code;
    }
}
exports.AppError = AppError;
function isAppError(error) {
    return error instanceof AppError;
}
