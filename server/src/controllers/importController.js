"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postImportWorkbook = postImportWorkbook;
const errors_1 = require("../lib/errors");
const importService_1 = require("../services/importService");
async function postImportWorkbook(req, res) {
    if (!req.file)
        throw new errors_1.AppError('An Excel workbook is required', 400, 'FILE_REQUIRED');
    const report = await (0, importService_1.importWorkbookBuffer)(req.file.buffer, req.file.originalname, req.actor?.id || 'admin-import');
    res.json({
        summary: {
            successful: report.successful.length,
            skipped: report.skipped.length,
            errors: report.errors.length,
            duplicates: report.duplicates.length,
        },
        ...report,
    });
}
