import { Injectable } from '@nestjs/common';
import * as ts from 'typescript';

export interface TranspileFileInput {
  name: string;
  code: string;
}

export interface TranspileResult {
  files: Array<{
    name: string;
    js: string;
    diagnostics: string[];
  }>;
}

/**
 * Compiles multi-file TypeScript from the Browser IDE using the real TypeScript compiler
 * with NestJS decorator flags (`experimentalDecorators` + `emitDecoratorMetadata`).
 */
@Injectable()
export class SandboxService {
  transpileFiles(files: TranspileFileInput[]): TranspileResult {
    return {
      files: files.map((file) => {
        const out = ts.transpileModule(file.code, {
          fileName: file.name,
          reportDiagnostics: true,
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.CommonJS,
            experimentalDecorators: true,
            emitDecoratorMetadata: true,
            esModuleInterop: true,
          },
        });
        const diagnostics = (out.diagnostics ?? []).map((d) =>
          ts.flattenDiagnosticMessageText(d.messageText, '\n'),
        );
        return {
          name: file.name,
          js: out.outputText,
          diagnostics,
        };
      }),
    };
  }
}
