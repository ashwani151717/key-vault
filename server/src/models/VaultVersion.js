"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.VaultVersion = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const errors_1 = require("../lib/errors");
const entrySchema = new mongoose_1.Schema({
    key: { type: String, required: true },
    value: { type: mongoose_1.Schema.Types.Mixed, default: null },
}, { _id: false });
const vaultVersionSchema = new mongoose_1.Schema({
    vaultId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Vault', required: true, index: true },
    versionNumber: { type: Number, required: true, min: 1 },
    entries: { type: [entrySchema], required: true },
    updatedBy: { type: String },
    changeSummary: {
        added: { type: Number, required: true },
        updated: { type: Number, required: true },
        unchanged: { type: Number, required: true },
    },
}, { timestamps: { createdAt: true, updatedAt: false } });
vaultVersionSchema.index({ vaultId: 1, versionNumber: 1 }, { unique: true });
vaultVersionSchema.index({ vaultId: 1, createdAt: -1 });
function rejectMutation() {
    throw new errors_1.AppError('Published vault versions are immutable', 400, 'IMMUTABLE_VERSION');
}
vaultVersionSchema.pre('updateOne', rejectMutation);
vaultVersionSchema.pre('updateMany', rejectMutation);
vaultVersionSchema.pre('findOneAndUpdate', rejectMutation);
vaultVersionSchema.pre('replaceOne', rejectMutation);
vaultVersionSchema.pre('deleteOne', rejectMutation);
vaultVersionSchema.pre('deleteMany', rejectMutation);
vaultVersionSchema.pre('findOneAndDelete', rejectMutation);
vaultVersionSchema.pre('findOneAndReplace', rejectMutation);
exports.VaultVersion = mongoose_1.default.model('VaultVersion', vaultVersionSchema);
