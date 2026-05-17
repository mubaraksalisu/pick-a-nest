import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { StatesService } from './states.service';
import { CreateStateDto } from './dto/create-state.dto';
import { UpdateStateDto } from './dto/update-state.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt.guard';
import { AdminGuard } from 'src/shared/guards/admin.guard';
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
import { StateResponseDto } from './dto/state-response.dto';
import { Roles } from 'src/shared/auth/decorators/roles.decorator';
import { UserRole } from 'src/shared/auth/enums/user-role.enum';
import { RolesGuard } from 'src/shared/auth/guards/roles.guard';

@ApiTags('states')
@Controller('states')
export class StatesController {
  constructor(private readonly statesService: StatesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a new state in Nigeria ' })
  @ApiConflictResponse({
    description: 'State with the same name already exist',
  })
  @ApiCreatedResponse({
    description: 'Creates and return newly created state document',
    type: StateResponseDto,
  })
  create(@Body(ValidationPipe) createStateDto: CreateStateDto) {
    return this.statesService.create(createStateDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all states in the country' })
  @ApiOkResponse({
    description: 'Return list of all states in the country',
    type: [StateResponseDto],
  })
  findAll() {
    return this.statesService.findAll();
  }

  @UseGuards(ObjectIdGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get a state by id' })
  @ApiParam({ name: 'id', type: String, description: 'id of the state to get' })
  @ApiNotFoundResponse({ description: 'No state found with the provided id' })
  @ApiOkResponse({
    description: 'Returns a state document by provided id',
    type: StateResponseDto,
  })
  findOne(@Param('id') id: string) {
    return this.statesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard, ObjectIdGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a state details by id' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'id of the state to update',
  })
  @ApiNotFoundResponse({ description: 'No state found with the provided id' })
  @ApiConflictResponse({
    description: 'State with the same name already exist',
  })
  @ApiOkResponse({
    description: 'Update and return updated state document',
    type: StateResponseDto,
  })
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateStateDto: UpdateStateDto,
  ) {
    return this.statesService.update(id, updateStateDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard, ObjectIdGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a state by id' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'id of the state to delete',
  })
  @ApiNotFoundResponse({ description: 'No state found with the provided id' })
  @ApiOkResponse({
    description: 'Delete and return deleted state document',
    type: StateResponseDto,
  })
  remove(@Param('id') id: string) {
    return this.statesService.remove(id);
  }
}
