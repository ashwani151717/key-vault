"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = require("../db");
const mongoose_1 = __importDefault(require("mongoose"));
const importService_1 = require("../services/importService");
async function main() {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error('Usage: npm run import:workbook -- <path-to-workbook>');
        process.exit(1);
    }
    const resolved = path_1.default.resolve(filePath);
    if (!fs_1.default.existsSync(resolved)) {
        console.error('Workbook file was not found');
        process.exit(1);
    }
    const buffer = fs_1.default.readFileSync(resolved);
    await (0, db_1.connectDb)();
    await (0, db_1.ensureProjects)();
    const report = await (0, importService_1.importWorkbookBuffer)(buffer, path_1.default.basename(resolved), 'import-script');
    console.log(JSON.stringify({
        file: path_1.default.basename(resolved),
        summary: {
            successful: report.successful.length,
            skipped: report.skipped.length,
            errors: report.errors.length,
            duplicates: report.duplicates.length,
        },
        successful: report.successful,
        skipped: report.skipped,
        errors: report.errors,
        duplicates: report.duplicates,
    }, null, 2));
    await mongoose_1.default.disconnect();
}
main().catch(async (error) => {
    const message = error instanceof Error ? error.message : 'Import failed';
    console.error(message);
    await mongoose_1.default.disconnect().catch(() => undefined);
    process.exit(1);
});
