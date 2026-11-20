import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/**
 * Turns "1,2,3" into [1, 2, 3] (or ['a','b'] with `{ numeric: false }`).
 * Pipes can be instantiated with options: `@Query('ids', new ParseCsvPipe({ numeric: true }))`.
 */
@Injectable()
export class ParseCsvPipe implements PipeTransform<string | undefined, Array<string | number>> {
  constructor(private readonly options: { numeric?: boolean; max?: number } = {}) {}

  transform(value: string | undefined, metadata: ArgumentMetadata): Array<string | number> {
    if (value === undefined || value === '') return [];
    const parts = value
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    if (this.options.max && parts.length > this.options.max) {
      throw new BadRequestException(`"${metadata.data}" accepts at most ${this.options.max} values`);
    }
    if (!this.options.numeric) return parts;

    return parts.map((p) => {
      const n = Number(p);
      if (!Number.isFinite(n)) {
        throw new BadRequestException(`"${metadata.data}" must be comma-separated numbers ("${p}" is not)`);
      }
      return n;
    });
  }
}
