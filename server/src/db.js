"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDb = connectDb;
exports.ensureProjects = ensureProjects;
exports.isTransactionUnsupported = isTransactionUnsupported;
exports.transactionsAvailable = transactionsAvailable;
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = require("./config");
const Vault_1 = require("./models/Vault");
async function connectDb(uri = (0, config_1.getConfig)().mongoUri) {
    if (mongoose_1.default.connection.readyState === 1)
        return mongoose_1.default.connection;
    await mongoose_1.default.connect(uri, { serverSelectionTimeoutMS: 8000 });
    return mongoose_1.default.connection;
}
async function ensureProjects() {
    return;
}
let transactionSupport = null;
function isTransactionUnsupported(error) {
    const message = error instanceof Error ? error.message : '';
    return /replica set|transaction numbers are only allowed/i.test(message);
}
async function transactionsAvailable() {
    if (transactionSupport !== null)
        return transactionSupport;
    const session = await mongoose_1.default.startSession();
    try {
        await session.withTransaction(async () => {
            await Vault_1.Vault.findOne().session(session).lean();
        });
        transactionSupport = true;
    }
    catch (error) {
        if (!isTransactionUnsupported(error))
            throw error;
        transactionSupport = false;
    }
    finally {
        session.endSession();
    }
    return transactionSupport;
}
