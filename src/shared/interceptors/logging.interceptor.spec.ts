import { CallHandler, ExecutionContext, HttpStatus } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { firstValueFrom, of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logger: { info: jest.Mock };
  let response: { statusCode: number };
  let context: ExecutionContext;

  beforeEach(() => {
    logger = { info: jest.fn() };
    interceptor = new LoggingInterceptor(logger as any);

    // Nest pre-sets this to the default for the HTTP method (201 for POST)
    // before the handler runs, and only the exception filter overwrites it
    // with the real status on failure.
    response = { statusCode: 201 };
    const request = {
      method: 'POST',
      originalUrl: '/auth/login',
      headers: {},
      ip: '127.0.0.1',
    };

    context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
  });

  it('logs the incoming request synchronously', () => {
    const next: CallHandler = { handle: () => of('ok') };

    interceptor.intercept(context, next);

    expect(logger.info).toHaveBeenCalledWith(
      'Incoming request',
      expect.objectContaining({ event: 'REQUEST', method: 'POST' }),
    );
  });

  it('logs the real response status code on success', async () => {
    response.statusCode = 200;
    const next: CallHandler = { handle: () => of('ok') };

    await firstValueFrom(interceptor.intercept(context, next));

    expect(logger.info).toHaveBeenCalledWith(
      'Outgoing response',
      expect.objectContaining({ event: 'RESPONSE', statusCode: 200 }),
    );
  });

  it('logs the status derived from the thrown exception (not the pre-handler default) and rethrows it', async () => {
    const exception = new UnauthorizedException('Invalid credentials');
    const next: CallHandler = { handle: () => throwError(() => exception) };

    await expect(
      firstValueFrom(interceptor.intercept(context, next)),
    ).rejects.toBe(exception);

    // response.statusCode is still 201 (the pre-handler default) here --
    // the fix must not have used it.
    expect(logger.info).toHaveBeenCalledWith(
      'Outgoing response',
      expect.objectContaining({
        event: 'RESPONSE',
        statusCode: HttpStatus.UNAUTHORIZED,
      }),
    );
  });

  it('logs 500 for a non-HttpException error and rethrows it', async () => {
    const error = new Error('boom');
    const next: CallHandler = { handle: () => throwError(() => error) };

    await expect(
      firstValueFrom(interceptor.intercept(context, next)),
    ).rejects.toBe(error);

    expect(logger.info).toHaveBeenCalledWith(
      'Outgoing response',
      expect.objectContaining({
        event: 'RESPONSE',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      }),
    );
  });
});
