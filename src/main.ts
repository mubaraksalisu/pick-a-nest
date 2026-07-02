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

  // Deliberately open to any origin, in every environment: this is a
  // portfolio/demo API and the goal is that anyone (a reviewer's own
  // frontend, a quick browser fetch(), etc.) can call it. `origin: true`
  // reflects the request's actual origin per response rather than sending
  // a literal `*`, which is what makes it spec-valid together with
  // `credentials: true` (browsers reject a literal wildcard origin
  // combined with credentials). The risk this normally guards against --
  // a malicious site riding a victim's session via auto-attached cookies
  // -- doesn't apply here since auth is a Bearer token that has to be
  // explicitly attached by the caller, not an ambient cookie.
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

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
