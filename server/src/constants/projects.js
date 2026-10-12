"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROJECT_DEFINITIONS = void 0;
exports.normalizeLabel = normalizeLabel;
exports.normalizeKey = normalizeKey;
exports.projectBySheetName = projectBySheetName;
exports.projectByNameOrSlug = projectByNameOrSlug;
exports.PROJECT_DEFINITIONS = [
    {
        slug: 's6web',
        name: 'S6Web',
        sheetNames: ['s6web'],
        environments: ['DEV1', 'DEV2', 'QA1', 'QA2', 'STAGE'],
    },
    {
        slug: 'skyplus',
        name: 'SkyPlus',
        sheetNames: ['skyplus'],
        environments: ['DEV', 'QA', 'UAT', 'PREPROD', 'PREPROD CANARY'],
    },
];
function normalizeLabel(value) {
    return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}
function normalizeKey(value) {
    return normalizeLabel(value).toLowerCase();
}
function projectBySheetName(sheetName) {
    const key = normalizeKey(sheetName);
    return exports.PROJECT_DEFINITIONS.find((project) => project.sheetNames.includes(key) ||
        project.slug === key ||
        normalizeKey(project.name) === key);
}
function projectByNameOrSlug(value) {
    const key = normalizeKey(value);
    return exports.PROJECT_DEFINITIONS.find((project) => project.slug === key || normalizeKey(project.name) === key);
}
