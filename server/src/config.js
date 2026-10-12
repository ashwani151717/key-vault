"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = getConfig;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
function getConfig() {
    const maxUpload = Number(process.env.MAX_UPLOAD_BYTES || 5 * 1024 * 1024);
    return {
        port: Number(process.env.PORT || 4000),
        mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ms-vault-manager',
        clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
        maxUploadBytes: Number.isFinite(maxUpload) && maxUpload > 0 ? maxUpload : 5 * 1024 * 1024,
        authRequired: process.env.AUTH_REQUIRED === 'true',
        previewSecret: process.env.PREVIEW_SECRET || 'dev-only-preview-secret',
        adminToken: process.env.ADMIN_TOKEN || '',
    };
}
