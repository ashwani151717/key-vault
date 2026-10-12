"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateQuery = validateQuery;
exports.validateBody = validateBody;
const errors_1 = require("../lib/errors");
function validateQuery(schema) {
    return (req, _res, next) => {
        const parsed = schema.safeParse(req.query);
        if (!parsed.success) {
            const message = parsed.error.issues
                .map((issue) => `${issue.path.join('.') || 'query'}: ${issue.message}`)
                .join('; ');
            next(new errors_1.AppError(message, 400, 'VALIDATION_ERROR'));
            return;
        }
        req.validatedQuery = parsed.data;
        next();
    };
}
function validateBody(schema) {
    return (req, _res, next) => {
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            const message = parsed.error.issues
                .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
                .join('; ');
            next(new errors_1.AppError(message, 400, 'VALIDATION_ERROR'));
            return;
        }
        req.validatedBody = parsed.data;
        next();
    };
}
