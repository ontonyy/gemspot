import { Controller, Get } from '@nestjs/common'
import { CategoriesService } from '../../application/categories/categories.service'
import type { CategoryDto } from '../../contracts/dto/place.dto'

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list(): Promise<CategoryDto[]> {
    return this.categories.list()
  }
}
