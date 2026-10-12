"use strict";
const mongoose = require("mongoose");
const changeSchema = new mongoose.Schema({
    added: { type: Number, default: 0 },
    updated: { type: Number, default: 0 },
    unchanged: { type: Number, default: 0 },
}, { _id: false });
const historySchema = new mongoose.Schema({
    version: { type: Number, required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    savedAt: { type: Date, required: true },
    updatedBy: { type: String, default: '' },
    changes: { type: changeSchema, default: () => ({}) },
}, { _id: false });
const activitySchema = new mongoose.Schema({
    action: { type: String, required: true },
    version: { type: Number, required: true },
    savedAt: { type: Date, required: true },
    by: { type: String, default: '' },
    added: { type: Number, default: 0 },
    updated: { type: Number, default: 0 },
    unchanged: { type: Number, default: 0 },
}, { _id: false });
const vaultSchema = new mongoose.Schema({
    project: { type: String, required: true },
    microservice: { type: String, required: true },
    environment: { type: String, required: true },
    version: { type: Number, required: true, default: 1, min: 1 },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    updatedBy: { type: String, default: '' },
    changes: { type: changeSchema, default: () => ({}) },
    history: { type: [historySchema], default: [] },
    activity: { type: [activitySchema], default: [] },
}, { timestamps: true, versionKey: false });
vaultSchema.index({ project: 1, microservice: 1, environment: 1 }, { unique: true });
exports.Vault = mongoose.model('Vault', vaultSchema);
