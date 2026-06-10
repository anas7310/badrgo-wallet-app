import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Observable, from, throwError, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { IdempotencyRecord, IdempotencyStatus } from '../../modules/idempotency/entities/idempotency-record.entity';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const idempotencyKey = request.headers['idempotency-key'];

    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    const repo = this.dataSource.getRepository(IdempotencyRecord);

    let record = await repo.findOne({ where: { idempotencyKey } });

    if (record) {
      if (record.status === IdempotencyStatus.IN_PROGRESS) {
        throw new ConflictException('Payment already in process');
      }

      // Return cached response bypassing the controller
      response.setHeader('Idempotent-Replayed', 'true');

      const payload = { ...(record.responseBody || {}) };
      Object.assign(payload, {
        isIdempotent: true,
        idempotencyStatus: record.status, // 'SUCCESS' or 'FAILED'
      });

      // For FAILED replays, restore the original error status code so Axios
      // routes it to onError on the frontend (non-2xx triggers rejection)
      if (record.status === IdempotencyStatus.FAILED) {
        response.status(record.responseCode || 400);
      } else {
        response.status(record.responseCode || 201);
      }

      return of(payload);
    }

    // Mark as in-progress
    record = repo.create({
      idempotencyKey,
      status: IdempotencyStatus.IN_PROGRESS,
    });
    await repo.save(record);

    return next.handle().pipe(
      switchMap((resData) => {
        // Success
        return from((async () => {
          record.status = IdempotencyStatus.SUCCESS;
          record.responseCode = response.statusCode || 201;
          record.responseBody = resData;
          await repo.save(record);
          return resData;
        })());
      }),
      catchError((err) => {
        // Failed
        return from((async () => {
          record.status = IdempotencyStatus.FAILED;
          record.responseCode = err.status || 500;
          record.responseBody = err.response || { message: err.message };
          await repo.save(record);
        })()).pipe(
          switchMap(() => throwError(() => err))
        );
      }),
    );
  }
}
