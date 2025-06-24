import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { ObjectIdGuard } from 'src/shared/guards/object-id.guard';

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @UseGuards(ObjectIdGuard, JwtAuthGuard)
  @Post(':id')
  addToFavorite(@Req() req, @Param('id') id: string) {
    return this.favoritesService.addToFavorite(req.user._id, id);
  }

  @UseGuards(JwtAuthGuard, ObjectIdGuard)
  @Delete(':id')
  removeFromFavorite(@Req() req, @Param('id') id: string) {
    return this.favoritesService.removeFromFavorite(req.user._id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-favorites')
  getMyFavorites(@Req() req) {
    return this.favoritesService.getMyFavorites(req.user._id);
  }

  @UseGuards(JwtAuthGuard, ObjectIdGuard)
  @Get(':id')
  async isPropertyFavorite(@Param('id') id: string, @Req() req) {
    const isFavorite = await this.favoritesService.isPropertyFavorite(
      req.user._id,
      id,
    );
    return { isFavorite };
  }
}
