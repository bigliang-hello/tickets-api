export type TicketSource = 'manual' | 'sms' | 'ocr'

export interface Ticket {
  id: string
  user_id: string
  train_code: string
  from_station: string
  to_station: string
  start_date: string
  depart_time?: string
  arrive_time?: string
  seat_no?: string
  gate?: string
  carriage_no?: string
  price?: number
  source_type: TicketSource
  raw_sms?: string
  raw_ocr_json?: unknown
  created_at?: string
  updated_at?: string
}

export interface ParsedFields {
  train_code?: string
  from_station?: string
  to_station?: string
  start_date?: string
  depart_time?: string
  arrive_time?: string
  seat_no?: string
  gate?: string
}