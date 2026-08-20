# Testing Skill

## Visao Geral

Jest 30 para testes unitarios no backend. Frontend sem test runner configurado (apenas lint e build como verificacao).

## Backend (Jest)

### Configuracao

- Jest 30 com ts-jest
- `rootDir: 'src'`
- `testRegex: '.*\.spec\.ts$'`
- `moduleNameMapper`: resolve `src/*` e remove `.js` de imports ESM

### Estrutura de Testes

Testes ficam ao lado dos arquivos que testam:

```
modulo/
  modulo.service.ts
  modulo.service.spec.ts    # Teste do service
  modulo.repository.ts
  modulo.repository.spec.ts # Teste do repository
```

### Patterns

**Unit test de service:**
```typescript
describe('TicketsService', () => {
  let service: TicketsService;
  let repository: jest.Mocked<TicketsRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: TicketsRepository, useValue: mockRepository() },
      ],
    }).compile();

    service = module.get(TicketsService);
    repository = module.get(TicketsRepository);
  });

  it('should issue ticket with HMAC signature', async () => {
    repository.findById.mockResolvedValue(mockReservation);
    const ticket = await service.issueForReservation(mockReservation.id);
    expect(ticket.signature).toBeDefined();
    expect(ticket.shortId).toHaveLength(8);
  });
});
```

**Unit test de repository (com Prisma mock):**
```typescript
describe('TicketsRepository', () => {
  let repository: TicketsRepository;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TicketsRepository,
        { provide: PrismaService, useValue: mockPrismaService() },
      ],
    }).compile();

    repository = module.get(TicketsRepository);
    prisma = module.get(PrismaService);
  });

  it('should mark ticket as used atomically', async () => {
    prisma.ticket.updateMany.mockResolvedValue({ count: 1 });
    const result = await repository.markUsed('ticket-id');
    expect(result).toBe(true);
  });

  it('should return false if already used', async () => {
    prisma.ticket.updateMany.mockResolvedValue({ count: 0 });
    const result = await repository.markUsed('ticket-id');
    expect(result).toBe(false);
  });
});
```

### Mock Helpers

```typescript
function mockPrismaService() {
  return {
    ticket: { findUnique: jest.fn(), updateMany: jest.fn(), create: jest.fn() },
    reservation: { findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn((fns) => fns(mockPrismaService())),
  };
}
```

### Comandos

```bash
cd apps/backend
npm test                  # Todos os testes
npx jest --watch          # Watch mode
npx jest tickets          # Testes de um modulo
npm run test:cov          # Coverage
npm run test:e2e          # E2E tests (test/)
```

## Frontend

### Verificacao

O frontend usa `tsc -b` (typecheck) e `eslint` como verificacao:

```bash
cd apps/frontend
npm run build     # tsc -b + vite build (typecheck e build)
npm run lint      # ESLint
```

### Por que sem testes?

- Projeto com escopo focado em demonstracao tecnica
- Prioridade em features e design
- Typecheck + lint cobrem erros estaticos
- Testes E2E seriam o proximo passo (Cypress/Playwright)

## Cobertura

```bash
cd apps/backend
npm run test:cov
```

Gera relatorio em `coverage/`. Meta sugerida: >80% em services e repositories.

## Arquivos de Referencia

- Config Jest: `apps/backend/package.json` (secao "jest")
- Testes existentes: `apps/backend/src/**/*.spec.ts`
- E2E tests: `apps/backend/test/`
