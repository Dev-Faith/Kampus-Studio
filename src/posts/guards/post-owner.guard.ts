import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Role } from '../../common/enums/role.enum';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { PostsService } from '../posts.service';

@Injectable()
export class PostOwnerGuard implements CanActivate {
  constructor(private readonly posts: PostsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      user?: AuthUser;
      params: { id?: string };
    }>();
    const user = req.user;
    if (!user) return false;
    if (user.role === Role.Admin) return true;

    const post = await this.posts.findOne(Number(req.params.id));
    if (post.authorId !== user.id) {
      throw new ForbiddenException('Only the post author or an admin may modify this post');
    }
    return true;
  }
}
