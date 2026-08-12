import { trimObjectValues } from '@/pipes/trim-object-value.pipe';
import { ClassSerializerInterceptor, PlainLiteralObject } from '@nestjs/common';
import { ClassTransformOptions } from 'class-transformer';

export class AppClassSerializerInterceptor extends ClassSerializerInterceptor {
  serialize(
    response: PlainLiteralObject | PlainLiteralObject[],
    options: ClassTransformOptions,
  ) {
    return super.serialize(
      trimObjectValues(response, {
        exclude: ['password'],
        omitEmpty: true,
        excludePrefix: ['_'],
        exposeEmptyArray: true,
      }),
      options,
    );
  }
}
