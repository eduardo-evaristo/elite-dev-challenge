import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateReservationDto } from './create-reservation.dto';

async function getErrors(payload: Partial<CreateReservationDto>) {
  const dto = plainToInstance(CreateReservationDto, payload);
  const errors = await validate(dto);
  return errors.flatMap((e) =>
    e.constraints ? Object.values(e.constraints) : [],
  );
}

describe('CreateReservationDto mutex rule', () => {
  it('rejects when both seatId and ticketTypeId are provided', async () => {
    const errors = await getErrors({
      eventId: 'evt-1',
      seatId: 'seat-1',
      ticketTypeId: 'tt-1',
    });
    expect(errors.some((m) => /exatamente um/i.test(m))).toBe(true);
  });

  it('rejects when neither seatId nor ticketTypeId is provided', async () => {
    const errors = await getErrors({ eventId: 'evt-1' });
    expect(errors.some((m) => /exatamente um/i.test(m))).toBe(true);
  });

  it('accepts when exactly one of seatId|ticketTypeId is provided', async () => {
    const seatOnly = await getErrors({
      eventId: 'evt-1',
      seatId: 'seat-1',
    });
    const ticketOnly = await getErrors({
      eventId: 'evt-1',
      ticketTypeId: 'tt-1',
    });
    expect(seatOnly.some((m) => /exatamente um/i.test(m))).toBe(false);
    expect(ticketOnly.some((m) => /exatamente um/i.test(m))).toBe(false);
  });
});
