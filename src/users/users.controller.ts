import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { Role } from '../common/enums/role.enum';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Auth(Role.Admin, Role.Moderator)
  findAll(@Query() query: PaginationQueryDto) {
    return this.users.findAll(query);
  }

  @Get(':id')
  @Auth()
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser) {
    this.assertSelfOrAdmin(actor, id);
    return this.users.findOne(id);
  }

  @Patch(':id')
  @Auth()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthUser,
  ) {
    this.assertSelfOrAdmin(actor, id);
    return this.users.update(id, dto);
  }

  @Patch(':id/role')
  @Auth(Role.Admin)
  setRole(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoleDto) {
    return this.users.setRole(id, dto.role);
  }

  @Delete(':id')
  @HttpCode(204)
  @Auth(Role.Admin)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.users.remove(id);
  }

  /** Resource-level authorization: roles alone can't express "only YOUR own profile". */
  private assertSelfOrAdmin(actor: AuthUser, targetId: string) {
    if (actor.role !== Role.Admin && actor.id !== targetId) {
      throw new ForbiddenException('You can only access your own profile');
    }
  }
}
