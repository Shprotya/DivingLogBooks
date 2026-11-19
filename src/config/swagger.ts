import swaggerJSDoc from 'swagger-jsdoc';

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
                url: "/logbook",
            },
        ],
    },
    apis: ['./src/controllers/*.ts', './src/models/*.ts']
};

export const swaggerSpec = swaggerJSDoc(options);