import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Construction Calculator API',
            version: '1.0.0',
            description: 'API documentation for Construction Calculator & Admin Backend',
        },
        servers: [
            {
                url: process.env.VITE_API_URL || 'http://localhost:9000',
                description: 'Development server',
            },
            {
                url: 'https://construction-api-nine.vercel.app',
                description: 'Production server',
            },
        ],
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
    apis: ['./Routes/**/*.js', './Routes/admin/**/*.js'], // files containing annotations as above
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
