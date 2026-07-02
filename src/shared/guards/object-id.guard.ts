import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';

@Injectable()
export class ObjectIdGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // Every route this guard is applied to has exactly one id-shaped route
    // param, but it isn't always named `id` (e.g. `:propertyId`), so fall
    // back to whichever single param is present instead of hardcoding `id`.
    const id = request.params.id ?? Object.values(request.params)[0];

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid id parameter format');
    }

    return true;
  }
}
