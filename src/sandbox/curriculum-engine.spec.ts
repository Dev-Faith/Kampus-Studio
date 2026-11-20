import { readFileSync } from 'fs';
import { join } from 'path';
import * as ts from 'typescript';
import * as vm from 'vm';

describe('NestJS Interactive Trainer Engine & Curriculum Verification', () => {
  let win: any;

  beforeAll(() => {
    const contextObj: any = {
      ts,
      performance: { now: () => Date.now() },
      setTimeout,
      clearTimeout,
      btoa: (str: string) => Buffer.from(str, 'utf8').toString('base64'),
      atob: (b64: string) => Buffer.from(b64, 'base64').toString('utf8'),
      URLSearchParams,
      console,
    };
    contextObj.window = contextObj;
    contextObj.global = contextObj;
    vm.createContext(contextObj);

    const engineCode = readFileSync(join(process.cwd(), 'public/js/engine.js'), 'utf8');
    const part1Code = readFileSync(join(process.cwd(), 'public/js/curriculum-part1.js'), 'utf8');
    const part2Code = readFileSync(join(process.cwd(), 'public/js/curriculum-part2.js'), 'utf8');
    const rationaleCode = readFileSync(
      join(process.cwd(), 'public/js/architectural-rationale.js'),
      'utf8',
    );
    const syntaxBridgeCode = readFileSync(join(process.cwd(), 'public/js/syntax-bridge.js'), 'utf8');
    const prismaMasteryCode = readFileSync(
      join(process.cwd(), 'public/js/prisma-mastery.js'),
      'utf8',
    );
    const mongooseMasteryCode = readFileSync(
      join(process.cwd(), 'public/js/mongoose-mastery.js'),
      'utf8',
    );
    const testingMasteryCode = readFileSync(
      join(process.cwd(), 'public/js/testing-mastery.js'),
      'utf8',
    );
    const tutorCode = readFileSync(
      join(process.cwd(), 'public/js/kampus-tutor.js'),
      'utf8',
    );

    vm.runInContext(engineCode, contextObj);
    vm.runInContext(part1Code, contextObj);
    vm.runInContext(part2Code, contextObj);
    vm.runInContext(rationaleCode, contextObj);
    vm.runInContext(syntaxBridgeCode, contextObj);
    vm.runInContext(prismaMasteryCode, contextObj);
    vm.runInContext(mongooseMasteryCode, contextObj);
    vm.runInContext(testingMasteryCode, contextObj);
    vm.runInContext(tutorCode, contextObj);
    win = contextObj;
  });

  it('loads all 14 curriculum modules, 32 sub-concepts, architectural rationale decisions, Syntax Rosetta Stone, Prisma Mastery, Mongoose Mastery, and Testing Mastery chapters', () => {
    expect(Array.isArray(win.NEST_CURRICULUM)).toBe(true);
    expect(win.NEST_CURRICULUM.length).toBe(14);
    const totalSubconcepts = win.NEST_CURRICULUM.reduce(
      (sum: number, m: any) => sum + (m.subconcepts?.length || 0),
      0,
    );
    expect(totalSubconcepts).toBe(32);
    for (const mod of win.NEST_CURRICULUM) {
      for (const sub of mod.subconcepts) {
        expect(Array.isArray(sub.architecturalDecisions)).toBe(true);
        expect(sub.architecturalDecisions.length).toBeGreaterThanOrEqual(1);
        expect(typeof sub.deepDiveHtml).toBe('string');
        expect(sub.deepDiveHtml.length).toBeGreaterThan(50);

        // Verify every lesson opens all referenced files (controller/service/spec + module/dto/config/schema)
        expect(Array.isArray(sub.exampleFiles)).toBe(true);
        expect(sub.exampleFiles.length).toBeGreaterThanOrEqual(3);
        expect(sub.exampleFiles.some((f: any) => f.name.endsWith('.module.ts'))).toBe(true);

        expect(Array.isArray(sub.exercise?.starterFiles)).toBe(true);
        expect(sub.exercise.starterFiles.length).toBeGreaterThanOrEqual(3);
        expect(sub.exercise.starterFiles.some((f: any) => f.name.endsWith('.module.ts'))).toBe(true);

        expect(Array.isArray(sub.exercise?.solutionFiles)).toBe(true);
        expect(sub.exercise.solutionFiles.length).toBeGreaterThanOrEqual(3);
        expect(sub.exercise.solutionFiles.some((f: any) => f.name.endsWith('.module.ts'))).toBe(true);
      }
    }
    expect(Array.isArray(win.NEST_DECORATOR_DECOMPILER)).toBe(true);
    expect(win.NEST_DECORATOR_DECOMPILER.length).toBeGreaterThanOrEqual(5);
    expect(Array.isArray(win.NEST_SYNTAX_CHAPTERS)).toBe(true);
    expect(win.NEST_SYNTAX_CHAPTERS.length).toBe(7);

    expect(typeof win.NEST_PRISMA_FULL_SCHEMA).toBe('string');
    expect(Array.isArray(win.NEST_PRISMA_SCHEMA_EXPLORER)).toBe(true);
    expect(win.NEST_PRISMA_SCHEMA_EXPLORER.length).toBe(6);
    expect(Array.isArray(win.NEST_PRISMA_CHAPTERS)).toBe(true);
    expect(win.NEST_PRISMA_CHAPTERS.length).toBe(7);
    for (const ch of win.NEST_PRISMA_CHAPTERS) {
      expect(Array.isArray(ch.decisions)).toBe(true);
      expect(ch.decisions.length).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(ch.syntaxMap)).toBe(true);
      expect(ch.syntaxMap.length).toBeGreaterThanOrEqual(3);
    }

    expect(typeof win.NEST_MONGOOSE_FULL_SCHEMA).toBe('string');
    expect(Array.isArray(win.NEST_MONGOOSE_SCHEMA_EXPLORER)).toBe(true);
    expect(win.NEST_MONGOOSE_SCHEMA_EXPLORER.length).toBe(6);
    expect(Array.isArray(win.NEST_MONGOOSE_CHAPTERS)).toBe(true);
    expect(win.NEST_MONGOOSE_CHAPTERS.length).toBe(7);
    for (const ch of win.NEST_MONGOOSE_CHAPTERS) {
      expect(Array.isArray(ch.decisions)).toBe(true);
      expect(ch.decisions.length).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(ch.syntaxMap)).toBe(true);
      expect(ch.syntaxMap.length).toBeGreaterThanOrEqual(3);
    }

    expect(typeof win.NEST_TESTING_FULL_SPEC).toBe('string');
    expect(Array.isArray(win.NEST_TESTING_HARNESS_EXPLORER)).toBe(true);
    expect(win.NEST_TESTING_HARNESS_EXPLORER.length).toBe(6);
    expect(Array.isArray(win.NEST_TESTING_CHAPTERS)).toBe(true);
    expect(win.NEST_TESTING_CHAPTERS.length).toBe(7);
    for (const ch of win.NEST_TESTING_CHAPTERS) {
      expect(Array.isArray(ch.architecturalDecisions)).toBe(true);
      expect(ch.architecturalDecisions.length).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(ch.syntaxMap)).toBe(true);
      expect(ch.syntaxMap.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('auto-heals missing closing braces in Request Body JSON so body fields never become "undefined"', async () => {
    const sub = win.NEST_CURRICULUM[0].subconcepts[0];
    win.NestSandboxEngine.resetState();
    const res = await win.NestSandboxEngine.executeRequest(sub.exercise.solutionFiles, {
      method: 'POST',
      url: '/users/',
      headers: { 'x-campus-client': 'student-web' },
      body: '{\n"email": "Faith",\n"name": "Faith"', // missing closing '}' just like user screenshot
    });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('faith');
    expect(res.body.name).toBe('Faith');
  });

  it('executes every sub-concept example preset without compilation or runtime crash', async () => {
    for (const mod of win.NEST_CURRICULUM) {
      for (const sub of mod.subconcepts) {
        win.NestSandboxEngine.resetState();
        const firstPreset = sub.presets?.[0];
        expect(firstPreset).toBeDefined();
        const res = await win.NestSandboxEngine.executeRequest(sub.exampleFiles, firstPreset);
        expect(res.status).toBeDefined();
        expect(res.statusText).not.toBe('Compilation Error');
        expect(res.statusText).not.toBe('Runtime Evaluation Error');
      }
    }
  });

  it('passes 100% of automated exercise tests when using each sub-concept reference solution', async () => {
    for (const mod of win.NEST_CURRICULUM) {
      for (const sub of mod.subconcepts) {
        const ex = sub.exercise;
        expect(ex).toBeDefined();
        for (const t of ex.tests) {
          win.NestSandboxEngine.resetState();
          let lastRes: any = null;
          const allResponses: any[] = [];
          if (Array.isArray(t.steps)) {
            for (const stepReq of t.steps) {
              lastRes = await win.NestSandboxEngine.executeRequest(ex.solutionFiles, stepReq);
              allResponses.push(lastRes);
            }
          } else {
            lastRes = await win.NestSandboxEngine.executeRequest(ex.solutionFiles, t.request);
            allResponses.push(lastRes);
          }
          const verdict = t.check(lastRes, win.NestSandboxEngine.getState(), allResponses);
          if (!verdict?.pass) {
            throw new Error(
              `Failed exercise test "${t.name}" in sub-concept ${sub.id}: ${verdict?.reason || JSON.stringify(lastRes)}`,
            );
          }
          expect(verdict.pass).toBe(true);
        }
      }
    }
  });

  it('answers context-aware questions and diagnoses student code via KampusAiTutor', async () => {
    expect(win.KampusAiTutor).toBeDefined();
    const sub11 = win.NEST_CURRICULUM[0].subconcepts[0]; // 1.1 Hostel Listings Controller
    const sub12 = win.NEST_CURRICULUM[0].subconcepts[1]; // 1.2 Providers & DI

    const ctx12 = {
      mode: 'trainer',
      trainerTab: 'exercise',
      subconcept: sub12,
      currentFiles: sub12.exercise.starterFiles,
      activeFileIndex: 0,
      lastExecutionResult: { status: 200, statusText: 'OK', body: {} },
      testResults: [
        { name: 'Calculates hostel rent with discount', pass: false, reason: 'Expected totalDue 162000' },
      ],
    };

    const chips = win.KampusAiTutor.getSuggestedQuestions(ctx12);
    expect(Array.isArray(chips)).toBe(true);
    expect(chips.length).toBeGreaterThanOrEqual(4);

    // 1. Diagnose starter code & failing tests
    const diagRes = await win.KampusAiTutor.askTutor('Debug my current code & tests', ctx12);
    expect(diagRes.source).toBe('built-in');
    expect(diagRes.answer).toContain('Calculates hostel rent with discount');

    // 2. Explain architectural Why for current lesson
    const whyRes = await win.KampusAiTutor.askTutor(
      'Why should the math be put in an injectable service and not directly in the controller?',
      ctx12,
    );
    expect(whyRes.answer).toContain('Why');
    expect(whyRes.answer.toLowerCase()).toContain('service');

    // 3. Explain decorators in current editor file
    const explainRes = await win.KampusAiTutor.askTutor(
      'Explain every decorator in my editor',
      {
        mode: 'trainer',
        trainerTab: 'learn',
        subconcept: sub11,
        currentFiles: sub11.exampleFiles,
        activeFileIndex: 0,
      },
    );
    expect(explainRes.answer).toContain('@Controller');
    expect(explainRes.answer).toContain('@Get');

    // 4. Specific question about constructor parameter properties ("private readonly")
    const readonlyRes = await win.KampusAiTutor.askTutor(
      'What does private readonly db: DatabaseService in the constructor do?',
      {
        mode: 'trainer',
        trainerTab: 'learn',
        subconcept: sub11,
        currentFiles: sub11.exampleFiles,
        activeFileIndex: 0,
      },
    );
    expect(readonlyRes.answer).toContain('Direct Answer');
    expect(readonlyRes.answer).toContain('this.db');
    expect(readonlyRes.answer).toContain('listings.controller.ts');

    // 5. Specific comparison question ("difference between @Param and @Query")
    const cmpRes = await win.KampusAiTutor.askTutor(
      'What is the difference between @Param and @Query?',
      {
        mode: 'trainer',
        trainerTab: 'learn',
        subconcept: sub11,
        currentFiles: sub11.exampleFiles,
        activeFileIndex: 0,
      },
    );
    expect(cmpRes.answer).toContain('Direct Comparison');
    expect(cmpRes.answer).toContain('@Param');
    expect(cmpRes.answer).toContain('@Query');

    // 6. Specific question about how the open files in the IDE connect
    const filesConnectRes = await win.KampusAiTutor.askTutor(
      'How do the open files in this lesson connect?',
      {
        mode: 'trainer',
        trainerTab: 'learn',
        subconcept: sub12,
        currentFiles: sub12.exampleFiles,
        activeFileIndex: 0,
      },
    );
    expect(filesConnectRes.answer).toContain('kampus-fee.service.ts');
    expect(filesConnectRes.answer).toContain('kampus-fee.config.ts');
    expect(filesConnectRes.answer).toContain('kampus-quote.module.ts');

    // 7. Regression test for specific multi-part question about kampus-fee.config.ts interface + variable + provide/useValue
    const feeConfigRes = await win.KampusAiTutor.askTutor(
      'Looking at the kampus-fee.config.ts file, why do we have the interface then the variable definition? also, in module, why do we have the provide set to the type and the useValue set to the variable itself?',
      {
        mode: 'trainer',
        trainerTab: 'learn',
        subconcept: sub12,
        currentFiles: sub12.exampleFiles,
        activeFileIndex: 0,
      },
    );
    expect(feeConfigRes.answer).not.toContain('How the 4 Open Files');
    expect(feeConfigRes.answer).toContain('Direct Answer');
    expect(feeConfigRes.answer).toContain('DEFAULT_KAMPUS_FEE_CONFIG');
    expect(feeConfigRes.answer).toContain('useValue');
  });
});
