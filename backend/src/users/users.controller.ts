import { Controller, Get } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { UserResponse } from './user-response.js';

@ApiTags('Users')
@ApiCookieAuth()
@ApiResponse({ status: 401, description: 'Sessão válida obrigatória.' })
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOkResponse({ type: UserResponse, isArray: true })
  list() {
    return this.users.list();
  }
}
