import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * LESSON: Custom exceptions
 * Domain-specific errors read better than sprinkling status codes everywhere.
 * 422 = "the request was well-formed, but violates a business rule".
 */
export class BusinessRuleException extends HttpException {
  constructor(
    message: string,
    public readonly code = 'BUSINESS_RULE_VIOLATION',
  ) {
    super({ message, code }, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}
