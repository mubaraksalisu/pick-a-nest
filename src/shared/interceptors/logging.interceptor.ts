import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Logger } from 'winston';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    const start = Date.now();

    this.logger.info('Incoming request', {
      event: 'REQUEST',
      method: request.method,
      url: request.originalUrl,
      userId: request.user?.id ?? null,
      ip: request.ip,
      userAgent: request.headers['user-agent'] || null,
    });

    return next.handle().pipe(
      finalize(() => {
        const response = context.switchToHttp().getResponse();

        this.logger.info('Outgoing response', {
          event: 'RESPONSE',
          method: request.method,
          url: request.originalUrl,
          statusCode: response.statusCode,
          duration: `${Date.now() - start}ms`,
          userId: request.user?.id ?? null,
          ip: request.ip,
          userAgent: request.headers['user-agent'] || null,
        });
      }),
    );
  }
}
