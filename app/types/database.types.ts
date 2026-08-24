export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      clientes: {
        Row: {
          id: number
          nombre: string
          celular: string
          created_at: string
        }
        Insert: {
          id?: never
          nombre: string
          celular: string
          created_at?: string
        }
        Update: {
          id?: never
          nombre?: string
          celular?: string
          created_at?: string
        }
        Relationships: []
      }
      productos: {
        Row: {
          id: number
          nombre: string
          descripcion: string | null
          precio_costo: number
          precio_venta: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: never
          nombre: string
          descripcion?: string | null
          precio_costo: number
          precio_venta: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: never
          nombre?: string
          descripcion?: string | null
          precio_costo?: number
          precio_venta?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
