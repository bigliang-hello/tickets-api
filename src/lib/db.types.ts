export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users_wechat: {
        Row: {
          id: string
          openid: string
          unionid: string | null
          nickname: string | null
          avatar_url: string | null
          created_at: string | null
          last_login_at: string | null
        }
        Insert: {
          id?: string
          openid: string
          unionid?: string | null
          nickname?: string | null
          avatar_url?: string | null
          created_at?: string | null
          last_login_at?: string | null
        }
        Update: {
          id?: string
          openid?: string
          unionid?: string | null
          nickname?: string | null
          avatar_url?: string | null
          created_at?: string | null
          last_login_at?: string | null
        }
      }
      tickets: {
        Row: {
          id: string
          user_id: string
          train_code: string
          from_station: string
          to_station: string | null
          start_date: string
          depart_time: string | null
          arrive_time: string | null
          seat_no: string | null
          gate: string | null
          carriage_no: string | null
          price: number | null
          source_type: 'manual' | 'sms' | 'ocr'
          raw_sms: string | null
          raw_ocr_json: Json | null
          note: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          train_code: string
          from_station: string
          to_station?: string | null
          start_date: string
          depart_time?: string | null
          arrive_time?: string | null
          seat_no?: string | null
          gate?: string | null
          carriage_no?: string | null
          price?: number | null
          source_type?: 'manual' | 'sms' | 'ocr'
          raw_sms?: string | null
          raw_ocr_json?: Json | null
          note?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['tickets']['Insert']>
      }
      train_routes_cache: {
        Row: {
          train_code: string
          depart_date: string
          route_json: Json
          cached_at: string | null
        }
        Insert: {
          train_code: string
          depart_date: string
          route_json: Json
          cached_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['train_routes_cache']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}