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
exports.assertSpreadsheetBuffer = assertSpreadsheetBuffer;
exports.parseInventoryWorkbook = parseInventoryWorkbook;
exports.parseUpdateWorkbook = parseUpdateWorkbook;
exports.buildUpdateTemplate = buildUpdateTemplate;
const XLSX = __importStar(require("xlsx"));
const projects_1 = require("../constants/projects");
const errors_1 = require("../lib/errors");
const jsonConfig_1 = require("../lib/jsonConfig");
function readWorkbook(buffer) {
    const prototype = Object.prototype;
    const before = new Set(Object.getOwnPropertyNames(prototype));
    try {
        return XLSX.read(buffer, {
            type: 'buffer',
            cellFormula: false,
            cellHTML: false,
            cellNF: false,
            cellStyles: false,
            cellDates: false,
            bookVBA: false,
        });
    }
    catch {
        throw new errors_1.AppError('The spreadsheet could not be read', 400, 'MALFORMED_SPREADSHEET');
    }
    finally {
        for (const key of Object.getOwnPropertyNames(prototype)) {
            if (!before.has(key))
                Reflect.deleteProperty(prototype, key);
        }
    }
}
function assertSpreadsheetBuffer(buffer, filename) {
    const lower = filename.toLowerCase();
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
        throw new errors_1.AppError('Only .xlsx and .xls files are allowed', 400, 'INVALID_FILE');
    }
    if (!buffer || buffer.length < 8) {
        throw new errors_1.AppError('The file is empty or not a spreadsheet', 400, 'INVALID_FILE');
    }
    const zip = buffer[0] === 0x50 && buffer[1] === 0x4b;
    const ole = buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0;
    if (lower.endsWith('.xlsx') && !zip) {
        throw new errors_1.AppError('File content is not an .xlsx workbook', 400, 'INVALID_FILE');
    }
    if (lower.endsWith('.xls') && !ole) {
        throw new errors_1.AppError('File content is not an .xls workbook', 400, 'INVALID_FILE');
    }
}
function cellText(sheet, row, column) {
    const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
    if (!cell || cell.v === undefined || cell.v === null)
        return '';
    return (0, projects_1.normalizeLabel)(String(cell.v));
}
function headerMap(sheet, headerRow, columnCount) {
    const map = new Map();
    for (let column = 0; column < columnCount; column += 1) {
        const label = (0, projects_1.normalizeKey)(cellText(sheet, headerRow, column));
        if (!label)
            continue;
        if (map.has(label)) {
            throw new errors_1.AppError('The spreadsheet has duplicate column headers', 400, 'MALFORMED_SPREADSHEET');
        }
        map.set(label, column);
    }
    return map;
}
function parseInventoryWorkbook(buffer, filename = 'workbook.xlsx') {
    assertSpreadsheetBuffer(buffer, filename);
    const workbook = readWorkbook(buffer);
    const planned = [];
    const skipped = [];
    const errors = [];
    const duplicates = [];
    if (workbook.SheetNames.length === 0) {
        throw new errors_1.AppError('The workbook has no sheets', 400, 'MALFORMED_SPREADSHEET');
    }
    for (const sheetName of workbook.SheetNames) {
        const project = (0, projects_1.projectBySheetName)(sheetName);
        const sheet = workbook.Sheets[sheetName];
        if (!project) {
            errors.push({
                sheet: sheetName,
                row: 1,
                microservice: '',
                environment: '',
                message: 'Sheet name is not a known project. Expected s6web or skyplus.',
            });
            continue;
        }
        if (!sheet || !sheet['!ref']) {
            errors.push({
                sheet: sheetName,
                row: 1,
                microservice: '',
                environment: '',
                message: 'Sheet is empty',
            });
            continue;
        }
        const range = XLSX.utils.decode_range(sheet['!ref']);
        const headers = headerMap(sheet, range.s.r, range.e.c + 1);
        const nameColumn = headers.get('ms name');
        const vaultColumn = headers.get('keyvault name');
        if (nameColumn === undefined || vaultColumn === undefined) {
            errors.push({
                sheet: sheetName,
                row: range.s.r + 1,
                microservice: '',
                environment: '',
                message: 'Sheet is missing MS Name or KeyVault Name',
            });
            continue;
        }
        const environmentColumns = project.environments.map((environment) => ({
            environment,
            column: headers.get((0, projects_1.normalizeKey)(environment)),
        }));
        const missingEnvironments = environmentColumns.filter((item) => item.column === undefined);
        if (missingEnvironments.length > 0) {
            errors.push({
                sheet: sheetName,
                row: range.s.r + 1,
                microservice: '',
                environment: missingEnvironments.map((item) => item.environment).join(', '),
                message: 'Sheet is missing one or more environment columns',
            });
            continue;
        }
        const seenNames = new Set();
        for (let row = range.s.r + 1; row <= range.e.r; row += 1) {
            const excelRow = row + 1;
            const microserviceName = cellText(sheet, row, nameColumn);
            const keyVaultName = cellText(sheet, row, vaultColumn);
            const rowHasEnvironmentValue = environmentColumns.some((item) => cellText(sheet, row, item.column) !== '');
            if (!microserviceName && !keyVaultName && !rowHasEnvironmentValue)
                continue;
            if (!microserviceName) {
                errors.push({
                    sheet: sheetName,
                    row: excelRow,
                    microservice: '',
                    environment: '',
                    message: 'Microservice name is missing',
                });
                continue;
            }
            const nameKey = (0, projects_1.normalizeKey)(microserviceName);
            if (seenNames.has(nameKey)) {
                duplicates.push({
                    sheet: sheetName,
                    row: excelRow,
                    microservice: microserviceName,
                    environment: '',
                    message: 'Duplicate microservice name in sheet. This row was not imported.',
                });
                continue;
            }
            seenNames.add(nameKey);
            for (const item of environmentColumns) {
                const column = item.column;
                const address = XLSX.utils.encode_cell({ r: row, c: column });
                const cell = sheet[address];
                const raw = cell ? cell.v : undefined;
                const parsed = (0, jsonConfig_1.parseConfigurationCell)(raw);
                if (!parsed.ok) {
                    const target = parsed.reason === 'empty' || parsed.reason === 'no_kv' ? skipped : parsed.reason === 'duplicate_keys' ? duplicates : errors;
                    target.push({
                        sheet: sheetName,
                        row: excelRow,
                        microservice: microserviceName,
                        environment: item.environment,
                        message: parsed.message,
                    });
                    continue;
                }
                planned.push({
                    sheet: sheetName,
                    row: excelRow,
                    projectSlug: project.slug,
                    projectName: project.name,
                    microserviceName,
                    environment: item.environment,
                    keyVaultName,
                    entries: parsed.entries,
                });
            }
        }
    }
    const known = new Set(projects_1.PROJECT_DEFINITIONS.flatMap((project) => project.sheetNames));
    if (!workbook.SheetNames.some((name) => known.has((0, projects_1.normalizeKey)(name)))) {
        throw new errors_1.AppError('Workbook does not contain an s6web or skyplus sheet', 400, 'MALFORMED_SPREADSHEET');
    }
    return { planned, skipped, errors, duplicates };
}
function parseUpdateWorkbook(buffer, filename) {
    assertSpreadsheetBuffer(buffer, filename);
    const workbook = readWorkbook(buffer);
    if (workbook.SheetNames.length !== 1) {
        throw new errors_1.AppError('Update file must contain exactly one sheet', 400, 'MALFORMED_SPREADSHEET');
    }
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet || !sheet['!ref']) {
        throw new errors_1.AppError('The spreadsheet is empty', 400, 'MALFORMED_SPREADSHEET');
    }
    const range = XLSX.utils.decode_range(sheet['!ref']);
    let headers;
    try {
        headers = headerMap(sheet, range.s.r, range.e.c + 1);
    }
    catch (error) {
        if (error instanceof errors_1.AppError)
            throw error;
        throw new errors_1.AppError('The spreadsheet could not be read', 400, 'MALFORMED_SPREADSHEET');
    }
    const keyColumn = headers.get('key');
    const valueColumn = headers.get('value');
    if (keyColumn === undefined || valueColumn === undefined) {
        throw new errors_1.AppError('Spreadsheet must contain Key and Value columns', 400, 'MALFORMED_SPREADSHEET');
    }
    const entries = [];
    const seen = new Map();
    const rowErrors = [];
    for (let row = range.s.r + 1; row <= range.e.r; row += 1) {
        const excelRow = row + 1;
        const keyCell = sheet[XLSX.utils.encode_cell({ r: row, c: keyColumn })];
        const valueCell = sheet[XLSX.utils.encode_cell({ r: row, c: valueColumn })];
        const keyRaw = keyCell?.v;
        const valueRaw = valueCell?.v;
        const keyBlank = keyRaw === undefined || keyRaw === null || String(keyRaw).replace(/\u00a0/g, ' ').trim() === '';
        const valueBlank = valueRaw === undefined || valueRaw === null || valueRaw === '';
        if (keyBlank && valueBlank)
            continue;
        if (keyBlank) {
            rowErrors.push(`Row ${excelRow}: Key is missing`);
            continue;
        }
        const key = String(keyRaw).replace(/\u00a0/g, ' ').trim();
        if (key.length > 500) {
            rowErrors.push(`Row ${excelRow}: Key is too long`);
            continue;
        }
        const previous = seen.get(key);
        if (previous) {
            rowErrors.push(`Duplicate key "${key}" on rows ${previous} and ${excelRow}`);
            continue;
        }
        seen.set(key, excelRow);
        const parsed = (0, jsonConfig_1.parseUpdateCellValue)(valueCell?.t, valueBlank ? '' : valueRaw);
        if (!parsed.ok) {
            rowErrors.push(`Row ${excelRow} (${key}): ${parsed.message}`);
            continue;
        }
        entries.push({ key, value: parsed.value });
    }
    if (rowErrors.length > 0) {
        throw new errors_1.AppError(rowErrors.slice(0, 20).join('; '), 400, 'INVALID_SPREADSHEET');
    }
    if (entries.length === 0) {
        throw new errors_1.AppError('Spreadsheet does not contain any key-value rows', 400, 'INVALID_SPREADSHEET');
    }
    if (entries.length > 5000) {
        throw new errors_1.AppError('Spreadsheet exceeds the 5000 key limit', 400, 'INVALID_SPREADSHEET');
    }
    return { entries };
}
function buildUpdateTemplate() {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
        ['Key', 'Value'],
        ['LOG_LEVEL', 'info'],
        ['RETRY_LIMIT', 3],
        ['FEATURE_ENABLED', true],
        ['FEATURE_FLAGS', '{"sms":false,"email":true}'],
        ['OPTIONAL_NOTE', 'null'],
    ]);
    sheet['!cols'] = [{ wch: 28 }, { wch: 48 }];
    XLSX.utils.book_append_sheet(workbook, sheet, 'Vault');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
