"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidObjectId = isValidObjectId;
const mongoose_1 = __importDefault(require("mongoose"));
function isValidObjectId(value) {
    return mongoose_1.default.Types.ObjectId.isValid(value) && String(new mongoose_1.default.Types.ObjectId(value)) === value;
}
