import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { PropertiesService } from 'src/modules/properties/properties.service';

@Injectable()
export class CanAccessPropertyGuard implements CanActivate {
  constructor(private readonly propertiesService: PropertiesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const propertyId = req.params.propertyId;

    if (!user) throw new ForbiddenException('Unauthorized');

    // find property without requiring approval
    const property = await this.propertiesService.findOne(propertyId, false);

    const ownerId = property?.ownerId?._id
      ? property.ownerId._id.toString()
      : property.ownerId?.toString();
    const userId = (user._id || user.sub || user.id || '').toString();

    if (ownerId === userId) return true;

    throw new ForbiddenException('Access denied to property visits');
  }
}
