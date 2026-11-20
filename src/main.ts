import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const port = config.getOrThrow<number>('port');

  app.enableCors();
  app.use(compression());

  // Serve the Interactive NestJS Trainer & Browser IDE from /public
  app.useStaticAssets(join(process.cwd(), 'public'));
  // Serve the local TypeScript compiler bundle so the browser IDE works offline with zero external dependency required
  app.useStaticAssets(join(process.cwd(), 'node_modules', 'typescript', 'lib'), {
    prefix: '/vendor/ts/',
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('NestJS Playground Live API')
    .setDescription('Live backend API accompanying the NestJS Interactive Trainer & IDE Sandbox')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
    .build();
  const doc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, doc);

  const logger = new Logger('Bootstrap');
  let activePort = port;
  for (const candidatePort of [port, 3333, 3400, 4000]) {
    try {
      await app.listen(candidatePort);
      activePort = candidatePort;
      break;
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === 'EADDRINUSE') {
        logger.warn(`Port ${candidatePort} is busy, trying next port...`);
        continue;
      }
      throw err;
    }
  }

  logger.log(`🚀 NestJS Interactive Trainer & IDE Sandbox running at http://localhost:${activePort}`);
  logger.log(`📚 Swagger API Explorer running at http://localhost:${activePort}/docs`);
}

void bootstrap();
