"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjects = getProjects;
exports.getEnvironments = getEnvironments;
const vaultService_1 = require("../services/vaultService");
async function getProjects(_req, res) {
    res.json({ projects: await (0, vaultService_1.listProjects)() });
}
async function getEnvironments(req, res) {
    const projectId = String(req.params.projectId || '');
    res.json(await (0, vaultService_1.listEnvironments)(projectId));
}
