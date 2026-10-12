"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actorMiddleware = actorMiddleware;
exports.requireUser = requireUser;
exports.requireRole = requireRole;
exports.requireRevealAccess = requireRevealAccess;
exports.requireAdminImport = requireAdminImport;
const config_1 = require("../config");
const errors_1 = require("../lib/errors");
const ID_PATTERN = /^[\w.@+:-]{1,120}$/;
function actorMiddleware(req, _res, next) {
    const rawId = req.header('x-user-id');
    const rawRoles = req.header('x-user-roles') || '';
    const id = rawId && ID_PATTERN.test(rawId) ? rawId : undefined;
    const roles = rawRoles
        .split(',')
        .map((role) => role.trim())
        .filter((role) => /^[\w:-]{1,40}$/.test(role));
    req.actor = { id, roles };
    next();
}
function requireUser(req, _res, next) {
    if (!(0, config_1.getConfig)().authRequired) {
        next();
        return;
    }
    if (!req.actor?.id) {
        next(new errors_1.AppError('Authentication required', 401, 'UNAUTHORIZED'));
        return;
    }
    next();
}
function requireRole(...roles) {
    return (req, _res, next) => {
        if (!(0, config_1.getConfig)().authRequired) {
            next();
            return;
        }
        if (!req.actor?.id) {
            next(new errors_1.AppError('Authentication required', 401, 'UNAUTHORIZED'));
            return;
        }
        const allowed = roles.some((role) => req.actor?.roles.includes(role));
        if (!allowed) {
            next(new errors_1.AppError('You do not have permission to perform this action', 403, 'FORBIDDEN'));
            return;
        }
        next();
    };
}
function requireRevealAccess(req, _res, next) {
    const reveal = req.query.reveal === 'true' || req.body?.reveal === 'true' || req.body?.reveal === true;
    if (!reveal) {
        next();
        return;
    }
    if (!(0, config_1.getConfig)().authRequired) {
        next();
        return;
    }
    if (!req.actor?.id) {
        next(new errors_1.AppError('Authentication required to reveal values', 401, 'UNAUTHORIZED'));
        return;
    }
    const allowed = req.actor.roles.some((role) => role === 'admin' || role === 'vault:reveal');
    if (!allowed) {
        next(new errors_1.AppError('You do not have permission to reveal values', 403, 'FORBIDDEN'));
        return;
    }
    next();
}
function requireAdminImport(req, _res, next) {
    const { adminToken, authRequired } = (0, config_1.getConfig)();
    if (adminToken) {
        const provided = req.header('x-admin-token') || '';
        if (provided !== adminToken) {
            next(new errors_1.AppError('Admin token is invalid', 401, 'UNAUTHORIZED'));
            return;
        }
    }
    if (authRequired) {
        if (!req.actor?.id) {
            next(new errors_1.AppError('Authentication required', 401, 'UNAUTHORIZED'));
            return;
        }
        if (!req.actor.roles.includes('admin')) {
            next(new errors_1.AppError('Admin role is required to import a workbook', 403, 'FORBIDDEN'));
            return;
        }
    }
    next();
}
