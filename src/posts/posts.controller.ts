import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { TrimPipe } from '../common/pipes/trim.pipe';
import { CreatePostDto, ListPostsQueryDto, UpdatePostDto } from './dto/post.dto';
import { PostOwnerGuard } from './guards/post-owner.guard';
import { PostsService } from './posts.service';

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Public()
  @Get()
  findAll(@Query() query: ListPostsQueryDto) {
    return this.posts.findAll(query);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.posts.findOne(id);
  }

  @Auth()
  @Post()
  create(@CurrentUser('id') userId: string, @Body(new TrimPipe()) dto: CreatePostDto) {
    return this.posts.create(userId, dto);
  }

  @Auth()
  @UseGuards(PostOwnerGuard)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body(new TrimPipe()) dto: UpdatePostDto) {
    return this.posts.update(id, dto);
  }

  @Auth()
  @UseGuards(PostOwnerGuard)
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.posts.remove(id);
  }
}
