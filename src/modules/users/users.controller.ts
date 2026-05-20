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
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './schemas/user.schema';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt.guard';
import { ObjectIdGuard } from 'src/shared/guards/object-id.guard';
import { Roles } from 'src/shared/auth/decorators/roles.decorator';
import { UserRole } from 'src/shared/auth/enums/user-role.enum';
import { RolesGuard } from 'src/shared/auth/guards/roles.guard';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import {
  GetUsersResponseDto,
  PaginationDto,
  UserResponseDto,
} from './dto/create-user.dto';
import { AuthenticatedRequest } from 'src/modules/auth/dto/auth.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
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

  @Roles(UserRole.USER)
  @Patch('apply-agent')
  @ApiOperation({ summary: 'Apply to become an agent (regular users only)' })
  @ApiOkResponse({
    description: 'Return user with pending agent review status',
    type: UserResponseDto,
  })
  applyAgent(@Req() req: AuthenticatedRequest): Promise<User> {
    return this.usersService.applyForAgentRole(req.user._id);
  }

  @Roles(UserRole.ADMIN)
  @Get('pending-agent-applications')
  @ApiOperation({ summary: 'Get pending agent applications' })
  @ApiQuery({
    name: 'page',
    description: 'page number',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    description: 'page size',
    required: false,
    type: Number,
  })
  @ApiOkResponse({
    description: 'Returns paginated pending agent applications',
    type: GetUsersResponseDto,
  })
  findPendingAgentApplications(@Query() pagination: PaginationDto) {
    return this.usersService.findPendingAgentApplications(pagination);
  }

  @UseGuards(ObjectIdGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/approve-agent')
  @ApiOperation({ summary: 'Approve a user to agent status' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID of the user to approve',
  })
  @ApiOkResponse({
    description: 'Return the updated user document',
    type: UserResponseDto,
  })
  approveAgent(@Param('id') id: string): Promise<User> {
    return this.usersService.approveAgent(id);
  }

  @UseGuards(ObjectIdGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/reject-agent')
  @ApiOperation({ summary: 'Reject a user agent application' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID of the user to reject',
  })
  @ApiOkResponse({
    description: 'Return the updated user document',
    type: UserResponseDto,
  })
  rejectAgent(@Param('id') id: string): Promise<User> {
    return this.usersService.rejectAgent(id);
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
