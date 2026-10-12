"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const config_1 = require("./config");
const errorHandler_1 = require("./middleware/errorHandler");
const actor_1 = require("./middleware/actor");
const routes_1 = require("./routes");
function createApp() {
    const app = (0, express_1.default)();
    app.disable('x-powered-by');
    app.use((0, cors_1.default)({ origin: (0, config_1.getConfig)().clientOrigin }));
    app.use(express_1.default.json({ limit: '1mb' }));
    app.use(actor_1.actorMiddleware);
    app.use('/api', routes_1.apiRouter);
    app.use(errorHandler_1.notFoundHandler);
    app.use(errorHandler_1.errorHandler);
    return app;
}
