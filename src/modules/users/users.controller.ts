import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  ValidationPipe,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './schemas/user.schema';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt.guard';
import { ObjectIdGuard } from 'src/shared/guards/object-id.guard';
import { AdminGuard } from 'src/shared/guards/admin.guard';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  GetUsersResponseDto,
  PaginationDto,
  UserResponseDto,
} from './dto/create-user.dto';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AdminGuard)
  @Get()
  @ApiOperation({ summary: 'Get users. Accessed only by admin' })
  @ApiQuery({
    name: 'page',
    description: 'page number of documents to get',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    description: 'limit of documents to get',
    type: Number,
  })
  @ApiOkResponse({
    description: 'Returns list of users according to pagination',
    type: GetUsersResponseDto,
  })
  findAll(@Query() pagination: PaginationDto) {
    return this.usersService.findAll(pagination);
  }

  @UseGuards(ObjectIdGuard)
  @ApiOperation({ summary: 'Get user by id' })
  @ApiParam({ name: 'id', type: String, description: 'ID of the user to get' })
  @ApiNotFoundResponse({ description: 'User with the provided id not found' })
  @ApiOkResponse({
    description: 'Return user with the provided id',
    type: UserResponseDto,
  })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findOne(id);
  }

  @UseGuards(ObjectIdGuard)
  @Patch(':id')
  @ApiOperation({ summary: 'Update user details by id' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID of the user to update',
  })
  @ApiNotFoundResponse({ description: 'User with the provided id not found' })
  @ApiOkResponse({
    description: 'Return updated document',
    type: UserResponseDto,
  })
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(id, updateUserDto);
  }

  @UseGuards(ObjectIdGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete user by ID' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID of the user to delete',
  })
  @ApiNotFoundResponse({ description: 'User with the provided id not found' })
  @ApiOkResponse({
    description: 'Return deleted document',
    type: UserResponseDto,
  })
  remove(@Param('id') id: string): Promise<User> {
    return this.usersService.remove(id);
  }
}
