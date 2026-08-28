"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSwagger = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'KallaPetty API',
            version: '1.0.0',
            description: 'API documentation for the KallaPetty billing system',
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    // Paths to files containing OpenAPI definitions
    apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};
const swaggerSpec = (0, swagger_jsdoc_1.default)(options);
const setupSwagger = (app) => {
    const swaggerOptions = {
        customCss: `
      .swagger-ui .topbar { display: none !important; }
      .swagger-ui .wrapper { max-width: 100% !important; padding: 0 2rem !important; }
    `,
        customSiteTitle: "KallaPetty API Docs",
    };
    app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec, swaggerOptions));
    console.log('[swagger]: Docs available at http://localhost:3000/api-docs');
};
exports.setupSwagger = setupSwagger;
