import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from './globalException.filter';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let logger: { error: jest.Mock };
  let response: { status: jest.Mock; json: jest.Mock };
  let host: ArgumentsHost;

  beforeEach(() => {
    logger = { error: jest.fn() };
    filter = new GlobalExceptionFilter(logger as any);

    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const request = { url: '/test', method: 'GET' };

    host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;
  });

  it('logs the real error message for unhandled non-HTTP exceptions but returns a generic message to the client', () => {
    const exception = new Error('DB connection string is malformed');

    filter.catch(exception, host);

    expect(logger.error).toHaveBeenCalledWith(
      'DB connection string is malformed',
      expect.objectContaining({ status: HttpStatus.INTERNAL_SERVER_ERROR }),
    );
    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Internal server error' }),
    );
  });

  it('logs and returns the same message for HttpExceptions', () => {
    const exception = new BadRequestException('Invalid email');

    filter.catch(exception, host);

    expect(logger.error).toHaveBeenCalledWith(
      'Invalid email',
      expect.objectContaining({ status: HttpStatus.BAD_REQUEST }),
    );
    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid email' }),
    );
  });
});
