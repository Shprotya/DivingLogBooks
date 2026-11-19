import swaggerJSDoc from 'swagger-jsdoc';
import { API_PREFIX } from './env';

const options: swaggerJSDoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Dive Logbook API',
            version: '1.0.0',
            description: 'REST API for managing dive logs and sites'
        },
        servers: [
            {
                url: API_PREFIX,
            },
        ],
    },
    apis: ['./src/controllers/*.ts', './src/models/*.ts']
};

export const swaggerSpec = swaggerJSDoc(options);