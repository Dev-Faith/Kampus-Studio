import { CacheModule } from '@nestjs/cache-manager';
import { ClassSerializerInterceptor, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dirname } from 'path';
import { mkdirSync } from 'fs';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RolesGuard } from './common/guards/roles.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { configuration, validateEnv } from './config/configuration';
import { SeedService } from './database/seed.service';
import { Post } from './posts/post.entity';
import { PostsModule } from './posts/posts.module';
import { SandboxModule } from './sandbox/sandbox.module';
import { User } from './users/user.entity';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbPath = config.getOrThrow<string>('database.path');
        const useDisk = dbPath !== ':memory:';
        if (useDisk) {
          mkdirSync(dirname(dbPath), { recursive: true });
        }
        return {
          type: 'sqljs',
          ...(useDisk ? { location: dbPath, autoSave: true } : {}),
          entities: [User, Post],
          synchronize: true,
        };
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.getOrThrow<number>('throttle.ttl'),
          limit: config.getOrThrow<number>('throttle.limit'),
        },
      ],
    }),
    CacheModule.register({ isGlobal: true, ttl: 10_000 }),
    EventEmitterModule.forRoot(),
    UsersModule,
    AuthModule,
    PostsModule,
    SandboxModule,
  ],
  providers: [
    SeedService,
    // Global Exception Filter
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // Global Guards (executed in registration order: Rate Limit -> Auth -> Roles)
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // Global Interceptors
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TimeoutInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*path');
  }
}
