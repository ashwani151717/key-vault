"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadTemplate = downloadTemplate;
const excelService_1 = require("../services/excelService");
function downloadTemplate(_req, res) {
    const buffer = (0, excelService_1.buildUpdateTemplate)();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="vault-update-template.xlsx"');
    res.send(buffer);
}
