# NestJS Backend Skill

## Visao Geral

NestJS 11 com arquitetura modular, usando Prisma 7 como ORM, JWT para autenticacao, e Passport para strategies.

## Convenções do Projeto

### Estrutura de Modulo

Cada dominio tem seu modulo em `src/{modulo}/`:

```
modulo/
  modulo.module.ts       # Declaracao do modulo
  modulo.controller.ts   # Endpoints HTTP
  modulo.service.ts      # Logica de negocio
  modulo.repository.ts   # Operacoes de banco (Prisma)
  dto/                   # Data Transfer Objects (class-validator)
  interfaces/            # Contratos (interfaces, Symbol tokens)
  providers/             # Implementacoes concretas (Strategy pattern)
```

### Controllers

- Prefixo definido em `@Controller('prefixo')`
- Use `@UseGuards(JwtGuard, RolesGuard)` + `@Roles()` para proteger endpoints
- DTOs com `class-validator` para validacao automatica (global `ValidationPipe`)
- Retorne sempre tipado (interfaces do `@elite-dev/shared`)

```typescript
@UseGuards(JwtGuard, RolesGuard)
@Roles(Role.ORGANIZER, Role.ADMIN)
@Get()
findAll(@Query() query: QueryEventsDto): Promise<PaginatedEventResult> {
  return this.eventsService.findAll(query);
}
```

### Services

- Contem logica de negocio, chamam repositories
- Nunca acessam Prisma diretamente (use o repository)
- Lancam excecoes NestJS (`NotFoundException`, `ConflictException`, `BadRequestException`)

### Repositories

- Encapsulam todas as operacoes Prisma
- Transacoes via `$transaction` do Prisma
- Operacoes atomicas para concorrencia

```typescript
async createReservation(data: CreateReservationDto, userId: string) {
  return this.prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.create({ data: { ... } });
    await tx.seat.update({ where: { id: data.seatId }, data: { status: 'RESERVED' } });
    return reservation;
  });
}
```

### Guards e Decorators

- `JwtGuard` - extrai JWT do cookie `access_token`
- `RolesGuard` - verifica role do usuario via `@Roles()` metadata
- `ThrottlerGuard` - rate limiting (10 req/60s global, customizavel por endpoint)

```typescript
@UseGuards(JwtGuard, RolesGuard, ThrottlerGuard)
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Roles(Role.GATE, Role.ADMIN)
@Post('validate')
validate(@Body() dto: ValidateTicketDto) { ... }
```

### Strategy Pattern (DI com Symbol tokens)

Para providers intercambiaveis:

```typescript
// Interface
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
export interface PaymentProvider {
  charge(input: ChargeInput): Promise<PaymentResult>;
}

// Factory provider
{
  provide: PAYMENT_PROVIDER,
  useFactory: (config: ConfigService) => {
    const provider = config.get('PAYMENT_PROVIDER', 'simulated');
    if (provider === 'simulated') return new SimulatedPaymentProvider();
    throw new Error(`Unknown provider: ${provider}`);
  },
  inject: [ConfigService],
}

// Uso no service
constructor(@Inject(PAYMENT_PROVIDER) private paymentProvider: PaymentProvider) {}
```

### Validacao Customizada

Use `class-validator` para validacoes complexas:

```typescript
@ExactlyOneOf('seatId', 'ticketTypeId')
eventId: string;
seatId?: string;
ticketTypeId?: string;
```

### Concorrencia

- **Assentos:** constraint de unicidade no banco + catch `P2002` -> `ConflictException`
- **Setores:** `UPDATE ... WHERE availableCount >= 1` em `$transaction` (retorna null se sold out)
- **Validacao de ingresso:** `UPDATEMany WHERE usedAt IS NULL` (single-winner, atomico)

### Configuracao

- `ConfigModule.forRoot` carrega `.env.production`, `.env`, `.env.development` (em ordem)
- Variaveis acessadas via `ConfigService` ou `@nestjs/config`
- Cookie options baseados em `NODE_ENV` (secure + sameSite:none em prod)

## Arquivos de Referencia

- Modulo raiz: `apps/backend/src/app.module.ts`
- Entry point: `apps/backend/src/main.ts`
- Auth: `apps/backend/src/auth/` (strategies, guards, controller, service)
- Catalog providers: `apps/backend/src/catalog/providers/` (tmdb, ticketmaster)
- Payments: `apps/backend/src/payments/` (provider interface, simulated)
- Tickets: `apps/backend/src/tickets/` (QR, HMAC, gate validation)

## Comandos

```bash
cd apps/backend
npm run dev          # Inicia em watch mode
npm run build        # Build para producao
npm run lint         # ESLint com --fix
npm test             # Jest unit tests
npx prisma generate  # Gera cliente Prisma
npx prisma migrate dev  # Cria migração
```
