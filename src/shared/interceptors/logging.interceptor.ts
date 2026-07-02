import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Logger } from 'winston';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const start = Date.now();

    this.logger.info('Incoming request', {
      event: 'REQUEST',
      method: request.method,
      url: request.originalUrl,
      userId: request.user?.id ?? null,
      ip: request.ip,
      userAgent: request.headers['user-agent'] || null,
    });

    const logResponse = (statusCode: number) => {
      this.logger.info('Outgoing response', {
        event: 'RESPONSE',
        method: request.method,
        url: request.originalUrl,
        statusCode,
        duration: `${Date.now() - start}ms`,
        userId: request.user?.id ?? null,
        ip: request.ip,
        userAgent: request.headers['user-agent'] || null,
      });
    };

    return next.handle().pipe(
      // Success path: by now Nest has already set the real status on the
      // response object, so reading it back here is accurate.
      tap(() => logResponse(response.statusCode)),
      // Error path: this runs *before* GlobalExceptionFilter sets the real
      // status, so response.statusCode still holds Nest's pre-handler
      // default (e.g. 201 for POST) rather than the actual error status.
      // Derive it from the exception itself instead, the same way
      // GlobalExceptionFilter does, then rethrow so the filter still runs.
      catchError((error: unknown) => {
        const statusCode =
          error instanceof HttpException
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;
        logResponse(statusCode);
        return throwError(() => error);
      }),
    );
  }
}
