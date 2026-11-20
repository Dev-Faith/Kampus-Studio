import { Injectable, PipeTransform } from '@nestjs/common';

/**
 * LESSON: Pipes (transformation)
 * A pipe receives the incoming value for ONE parameter and returns the (possibly changed) value
 * or throws. Two jobs: TRANSFORM (string -> number) and VALIDATE.
 * This one recursively trims every string in a body.
 */
@Injectable()
export class TrimPipe implements PipeTransform {
  transform(value: unknown): unknown {
    return this.trim(value);
  }

  private trim(value: unknown): unknown {
    if (typeof value === 'string') return value.trim();
    if (Array.isArray(value)) return value.map((v) => this.trim(v));
    if (value && typeof value === 'object' && value.constructor === Object) {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, this.trim(v)]),
      );
    }
    return value;
  }
}
