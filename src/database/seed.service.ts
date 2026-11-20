import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { Role } from '../common/enums/role.enum';
import { PostsService } from '../posts/posts.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Seed');

  constructor(
    private readonly users: UsersService,
    private readonly posts: PostsService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const adminEmail = this.config.getOrThrow<string>('admin.email');
    const existing = await this.users.findByEmail(adminEmail);
    if (existing) return;

    const adminPassword = this.config.getOrThrow<string>('admin.password');
    const admin = await this.users.create({
      email: adminEmail,
      name: 'Playground Admin',
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: Role.Admin,
    });

    const user = await this.users.create({
      email: 'ada@playground.dev',
      name: 'Ada Lovelace',
      passwordHash: await bcrypt.hash('User1234!', 10),
      role: Role.User,
    });

    await this.posts.create(admin.id, {
      title: 'Welcome to the NestJS Interactive Trainer',
      content: 'Explore the 11 modules in the IDE to master Guards, Auth, Interceptors, Pipes, Rate Limiting, Caching and more!',
      published: true,
    });

    await this.posts.create(user.id, {
      title: 'Understanding the NestJS Request Lifecycle',
      content: 'Middleware -> Guards -> Interceptors (Pre) -> Pipes -> Handler -> Interceptors (Post) -> Exception Filters.',
      published: true,
    });

    this.logger.log(`Seeded default accounts (${adminEmail} and ada@playground.dev)`);
  }
}
