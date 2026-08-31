import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJSDoc.Options = {
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

const swaggerSpec = swaggerJSDoc(options);

export const setupSwagger = (app: Express) => {
  const swaggerOptions = {
    customCss: `
      .swagger-ui .topbar { display: none !important; }
      .swagger-ui .wrapper { max-width: 100% !important; padding: 0 2rem !important; }
    `,
    customSiteTitle: "KallaPetty API Docs",
  };

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));
  console.log('[swagger]: Docs available at http://localhost:3000/api-docs');
};
