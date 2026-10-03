import { Controller, Get } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service.js';
import { CategoryResponse } from './category-response.js';

@ApiTags('Categories')
@ApiCookieAuth()
@ApiResponse({ status: 401, description: 'Sessão válida obrigatória.' })
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @ApiOkResponse({ type: CategoryResponse, isArray: true })
  list() {
    return this.categories.list();
  }
}
