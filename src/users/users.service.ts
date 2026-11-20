import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Page, PaginationQueryDto, paginate } from '../common/dto/pagination.dto';
import { Role } from '../common/enums/role.enum';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './user.entity';

/**
 * LESSON: Providers / services
 * Anything `@Injectable()` can be injected. Services hold business logic; controllers just map
 * HTTP <-> service calls. `@InjectRepository` gives you TypeORM's repository for an entity.
 */
@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  async findAll(query: PaginationQueryDto): Promise<Page<User>> {
    const [items, total] = await this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return paginate(items, total, query);
  }

  async findOne(id: string): Promise<User> {
    const user = await this.repo.findOneBy({ id });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOneBy({ email: email.toLowerCase() });
  }

  create(data: { email: string; name: string; passwordHash: string; role?: Role }): Promise<User> {
    return this.repo.save(this.repo.create({ ...data, email: data.email.toLowerCase() }));
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    if (dto.email) user.email = dto.email.toLowerCase();
    if (dto.name) user.name = dto.name;
    return this.repo.save(user);
  }

  async setRole(id: string, role: Role): Promise<User> {
    const user = await this.findOne(id);
    user.role = role;
    return this.repo.save(user);
  }

  async setRefreshTokenHash(id: string, hash: string | null): Promise<void> {
    await this.repo.update({ id }, { refreshTokenHash: hash });
  }

  async remove(id: string): Promise<void> {
    const res = await this.repo.delete({ id });
    if (!res.affected) throw new NotFoundException(`User ${id} not found`);
  }
}
