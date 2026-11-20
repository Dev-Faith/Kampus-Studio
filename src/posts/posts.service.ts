import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import { Page, paginate } from '../common/dto/pagination.dto';
import { CreatePostDto, ListPostsQueryDto, UpdatePostDto } from './dto/post.dto';
import { Post } from './post.entity';

const POST_TTL_MS = 30_000;
const cacheKey = (id: number) => `post:${id}`;

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post) private readonly repo: Repository<Post>,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async findAll(query: ListPostsQueryDto): Promise<Page<Post>> {
    const qb = this.repo
      .createQueryBuilder('post')
      .leftJoin('post.author', 'author')
      .addSelect(['author.id', 'author.name'])
      .where('post.published = :published', { published: true })
      .orderBy('post.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (query.search) {
      qb.andWhere('(post.title LIKE :s OR post.content LIKE :s)', { s: `%${query.search}%` });
    }
    if (query.authorId) qb.andWhere('post.authorId = :authorId', { authorId: query.authorId });
    if (query.minLength) qb.andWhere('LENGTH(post.content) >= :min', { min: query.minLength });

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, query);
  }

  async findOne(id: number): Promise<Post> {
    const cached = await this.cache.get<Post>(cacheKey(id));
    if (cached) return cached;

    const post = await this.repo
      .createQueryBuilder('post')
      .leftJoin('post.author', 'author')
      .addSelect(['author.id', 'author.name'])
      .where('post.id = :id', { id })
      .getOne();
    if (!post) throw new NotFoundException(`Post ${id} not found`);

    await this.cache.set(cacheKey(id), post, POST_TTL_MS);
    return post;
  }

  async create(authorId: string, dto: CreatePostDto): Promise<Post> {
    return this.repo.save(this.repo.create({ ...dto, authorId }));
  }

  async update(id: number, dto: UpdatePostDto): Promise<Post> {
    const post = await this.findOne(id);
    await this.repo.update({ id }, dto);
    await this.cache.del(cacheKey(id));
    return { ...post, ...(await this.findOne(id)) };
  }

  async remove(id: number): Promise<void> {
    const res = await this.repo.delete({ id });
    if (!res.affected) throw new NotFoundException(`Post ${id} not found`);
    await this.cache.del(cacheKey(id));
  }
}
