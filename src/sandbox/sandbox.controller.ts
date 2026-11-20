import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { RawResponse } from '../common/decorators/raw-response.decorator';
import { SandboxService, TranspileFileInput } from './sandbox.service';

@ApiTags('sandbox')
@SkipThrottle()
@Public()
@RawResponse()
@Controller('sandbox')
export class SandboxController {
  constructor(private readonly sandbox: SandboxService) {}

  @Get('health')
  health() {
    return {
      status: 'ok',
      engine: 'NestJS 11 + TypeScript Compiler',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('tutor-config')
  tutorConfig() {
    const key = (process.env.GEMINI_API_KEY || '').trim();
    return {
      hasGeminiKey: Boolean(key),
      geminiApiKey: key,
    };
  }

  @Post('transpile')
  transpile(@Body() body: { files: TranspileFileInput[] }) {
    return this.sandbox.transpileFiles(body?.files ?? []);
  }
}
