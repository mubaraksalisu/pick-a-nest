import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  UseGuards,
  Req,
  Body,
  ValidationPipe,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt.guard';
import { ObjectIdGuard } from 'src/shared/guards/object-id.guard';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateFavoriteDto,
  CreateFavoriteResponseDto,
  MyFavoritesResponseDto,
} from './dto/create-favorite.dto';

@UseGuards(JwtAuthGuard)
@ApiTags('favorites')
@ApiBearerAuth()
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post()
  @ApiOperation({ summary: 'Add property to user favorite list' })
  @ApiCreatedResponse({
    description: 'Add property to user favorite list',
    type: CreateFavoriteResponseDto,
  })
  @ApiNotFoundResponse({ description: 'No user found with the given userId' })
  @ApiNotFoundResponse({
    description: 'No property with the provided propertyId',
  })
  @ApiConflictResponse({ description: 'Already added to your favorite' })
  addToFavorite(
    @Req() req: any,
    @Body(ValidationPipe) createFavoriteDto: CreateFavoriteDto,
  ) {
    return this.favoritesService.addToFavorite(
      req.user._id,
      createFavoriteDto.propertId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get user favorite list' })
  @ApiNotFoundResponse({ description: 'User favorites list is empty' })
  @ApiOkResponse({
    description: 'Return user favorite list',
    type: MyFavoritesResponseDto,
  })
  getMyFavorites(@Req() req: any) {
    return this.favoritesService.getMyFavorites(req.user._id);
  }

  @UseGuards(ObjectIdGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get favorite by id' })
  @ApiParam({
    description: 'unique id of favorite to get',
    name: 'id',
    type: String,
  })
  @ApiNotFoundResponse({ description: 'No favorite with the provided id' })
  @ApiOkResponse({
    description: 'returns one favorite document',
    type: CreateFavoriteResponseDto,
  })
  async isPropertyFavorite(@Param('id') id: string) {
    return this.favoritesService.findOne(id);
  }

  @UseGuards(ObjectIdGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete favorite by id' })
  @ApiParam({
    description: 'unique id of favorite to delete',
    name: 'id',
    type: String,
  })
  @ApiNotFoundResponse({ description: 'Not in user favorite list' })
  @ApiOkResponse({
    description: 'returns the deleted document',
    type: CreateFavoriteResponseDto,
  })
  removeFromFavorite(@Req() req: any, @Param('id') id: string) {
    return this.favoritesService.removeFromFavorite(req.user._id, id);
  }
}
