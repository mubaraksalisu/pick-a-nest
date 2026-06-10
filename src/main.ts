import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true, // ensures logs are captured before Winston is ready
  });

  app.use(helmet());

  // app.enableCors({
  //   origin: '*', // allow all origins for simplicity; adjust as needed for production
  //   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  //   credentials: true,
  // });

  const config = new DocumentBuilder()
    .setTitle('Real Estate API')
    .setDescription('A comprehensive API documentation for the entire app')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown properties
      forbidNonWhitelisted: true, // throw error if unknown props
      transform: true, // auto-transform payloads to DTOs
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
