"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.spreadsheetUpload = void 0;
const multer_1 = __importDefault(require("multer"));
const config_1 = require("../config");
const errors_1 = require("../lib/errors");
exports.spreadsheetUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        files: 1,
        fileSize: (0, config_1.getConfig)().maxUploadBytes,
    },
    fileFilter: (_req, file, callback) => {
        const name = file.originalname.toLowerCase();
        if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
            callback(new errors_1.AppError('Only .xlsx and .xls files are allowed', 400, 'INVALID_FILE'));
            return;
        }
        callback(null, true);
    },
});
