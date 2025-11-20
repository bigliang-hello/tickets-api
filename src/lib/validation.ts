import { z } from 'zod'

export const TicketCreateSchema = z.object({
  train_code: z.string().min(1),
  from_station: z.string().min(1),
  to_station: z.string().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  depart_time: z.string().optional(),
  arrive_time: z.string().optional(),
  seat_no: z.string().optional(),
  gate: z.string().optional(),
  carriage_no: z.string().optional(),
  price: z.number().optional(),
  source_type: z.enum(['manual','sms','ocr']).default('manual'),
  raw_sms: z.string().optional(),
  raw_ocr_json: z.any().optional(),
})