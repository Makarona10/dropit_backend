import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';
import { SuccessResponseDTO } from 'src/common/dto/response.dto';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, SuccessResponseDTO<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<SuccessResponseDTO<T>> {
    const httpContext = context.switchToHttp();
    const response = httpContext.getResponse<Response>();

    return next
      .handle()
      .pipe(map((data) => this.formatResponse(data, response.statusCode)));
  }

  private formatResponse(data: any, statusCode: number): SuccessResponseDTO<T> {
    if (data === null || data === undefined) {
      return { status: 'success', message: '', data: [], statusCode };
    }

    if (typeof data === 'object' && !Array.isArray(data)) {
      const { message, ...rest } = data as Record<string, any>;
      return {
        status: 'success',
        message: typeof message === 'string' ? message : '',
        data: Object.keys(rest).length > 0 ? [rest as T] : [],
        statusCode,
      };
    }

    if (Array.isArray(data)) {
      return { status: 'success', message: '', data, statusCode };
    }

    return { status: 'success', message: String(data), data: [], statusCode };
  }
}
