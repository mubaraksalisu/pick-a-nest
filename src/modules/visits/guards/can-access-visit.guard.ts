import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { VisitsService } from '../visits.service';
import { PropertiesService } from 'src/modules/properties/properties.service';

@Injectable()
export class CanAccessVisitGuard implements CanActivate {
  constructor(
    private readonly visitsService: VisitsService,
    private readonly propertiesService: PropertiesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const id = req.params.id;

    if (!user) throw new ForbiddenException('Unauthorized');

    const visit = await this.visitsService.findOne(id);

    const userId = (user._id || user.sub || user.id || '').toString();

    if (visit.agentId?.toString() === userId) return true;
    if (visit.customerId?.toString() === userId) return true;

    const property = await this.propertiesService.findOne(
      visit.propertyId.toString(),
      false,
    );
    const ownerId = property?.ownerId?._id
      ? property.ownerId._id.toString()
      : property.ownerId?.toString();

    if (ownerId === userId) return true;

    throw new ForbiddenException('Access denied to this visit');
  }
}
