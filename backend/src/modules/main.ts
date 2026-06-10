import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    
    
    app.enableCors({
        origin: process.env.NODE_ENV === 'production'
            ? process.env.FRONTEND_URL
            : true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
        exposedHeaders: ['Idempotent-Replayed'],
    });

    
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: { enableImplicitConversion: true },
        }),
    );

    
    app.useGlobalFilters(new HttpExceptionFilter());

    
    app.useGlobalInterceptors(new LoggingInterceptor());

    
    const swaggerConfig = new DocumentBuilder()
        .setTitle('Badrgo Wallet API')
        .setDescription('Mini Operations Wallet Portal — Backend API')
        .setVersion('1.0')
        .addTag('users', 'User management')
        .addTag('wallets', 'Wallet operations and transactions')
        .addTag('reports', 'Reporting and daily summaries')
        .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api', app, document);

    const port = process.env.PORT ?? 3000;
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 Badrgo Wallet API running on http://localhost:${port}`);
    console.log(`🌐 Network access: http://192.168.0.54:${port}`);
    console.log(`📖 Swagger docs at http://localhost:${port}/api`);
}

bootstrap();

