import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { CustomBusinessException } from './custom-business.exception';
import { WinstonLogger } from 'src/logger/winston.logger';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new WinstonLogger();

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const { statusCode, message, errorResponse } =
      this.formatException(exception);

    this.logger.error(`Exception: ${message}`, {
      statusCode,
      stack: exception instanceof Error ? exception.stack : undefined,
      context: exception,
    });

    return response.status(statusCode).json({
      statusCode,
      message,
      ...(errorResponse && { details: errorResponse }),
    });
  }

  private formatException(exception: unknown): {
    statusCode: number;
    message: string;
    errorResponse?: any;
  } {
    if (exception instanceof BadRequestException) {
      const responseData = exception.getResponse();

      const message = (responseData as any)?.message as string | string[];

      return {
        statusCode: 400,
        message: Array.isArray(message)
          ? message.join(', ')
          : message || 'Validation failed',
        errorResponse: responseData,
      };
    }

    if (
      exception instanceof HttpException ||
      exception instanceof CustomBusinessException
    ) {
      return {
        statusCode: exception.getStatus(),
        message: exception.message || 'An error occurred',
        errorResponse: exception.getResponse(),
      };
    }

    return {
      statusCode: 500,
      message: 'Internal server error. Please try again later.',
    };
  }
}
