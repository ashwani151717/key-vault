"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const config_1 = require("./config");
const db_1 = require("./db");
async function main() {
    const config = (0, config_1.getConfig)();
    await (0, db_1.connectDb)(config.mongoUri);
    await (0, db_1.ensureProjects)();
    const app = (0, app_1.createApp)();
    app.listen(config.port, () => {
        console.log(`MS Vault Manager API listening on port ${config.port}`);
        if (!config.authRequired) {
            console.warn('Authentication is disabled. Do not use this configuration with real secrets outside a trusted local environment.');
        }
    });
}
main().catch((error) => {
    const message = error instanceof Error ? error.message : 'Unknown startup error';
    console.error(`Failed to start API: ${message}`);
    process.exit(1);
});
