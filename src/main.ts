import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true, // ensures logs are captured before Winston is ready
  });

  app.use(helmet());

  const configService = app.get(ConfigService);
  const frontendUrl = configService.get<string>('FRONTEND_URL');

  // `origin: '*'` combined with `credentials: true` is invalid per the CORS
  // spec -- browsers refuse to expose credentialed responses to a wildcard
  // origin, regardless of what the server sends. In production this must be
  // a specific, configured origin; locally we reflect the request origin
  // (still not a literal wildcard) so any local frontend port works.
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  if (isProduction && !frontendUrl) {
    // The `cors` package treats a falsy `origin` as "allow any origin", so
    // an unset FRONTEND_URL in production would silently reintroduce the
    // same open-CORS problem. Fail fast instead -- using console.error +
    // process.exit rather than throw, since NestFactory.create was called
    // with bufferLogs: true and useLogger() hasn't run yet, so a thrown
    // error here would sit in winston's buffered/exitOnError:false handling
    // and hang the process instead of visibly crashing it.
    console.error('FRONTEND_URL must be set in production for CORS');
    process.exit(1);
  }

  app.enableCors({
    origin: isProduction ? frontendUrl : true,
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
