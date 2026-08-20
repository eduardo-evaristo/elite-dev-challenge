import { z } from 'zod';

export const checkoutSearchSchema = z.object({
  eventId: z.string(),
  mode: z.enum(['seat', 'ticket']),
  reservationIds: z.array(z.string()).default([]),
  seatIds: z.array(z.string()).optional(),
  ticketTypeId: z.string().optional(),
  price: z.number(),
});

export type CheckoutSearch = z.infer<typeof checkoutSearchSchema>;

export const buyerDataSchema = z.object({
  name: z.string().min(1, 'Informe seu nome'),
  email: z.string().email('E-mail inválido'),
  cpf: z.string().min(1, 'Informe seu CPF'),
  phone: z.string().min(1, 'Informe seu telefone'),
});

export type BuyerData = z.infer<typeof buyerDataSchema>;

export const cardDataSchema = z.object({
  cardNumber: z.string().min(1, 'Informe o número do cartão'),
  expiry: z.string().min(1, 'Informe a validade'),
  cvv: z.string().min(1, 'Informe o CVV'),
  cardName: z.string().min(1, 'Informe o nome impresso'),
});

export type CardData = z.infer<typeof cardDataSchema>;
