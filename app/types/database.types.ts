export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type VentaEstado = 'Completo' | 'Pendiente' | 'No pagado'

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
      ventas: {
        Row: {
          id: number
          cliente_id: number | null
          cliente_nombre: string
          cliente_celular: string | null
          fecha: string
          total: number
          ganancia_total: number
          pagado: number
          descuento: number
          estado: VentaEstado
          created_at: string
        }
        Insert: {
          id?: never
          cliente_id?: number | null
          cliente_nombre: string
          cliente_celular?: string | null
          fecha?: string
          total: number
          ganancia_total?: number
          pagado?: number
          descuento?: number
          estado: VentaEstado
          created_at?: string
        }
        Update: {
          id?: never
          cliente_id?: number | null
          cliente_nombre?: string
          cliente_celular?: string | null
          fecha?: string
          total?: number
          ganancia_total?: number
          pagado?: number
          descuento?: number
          estado?: VentaEstado
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ventas_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
        ]
      }
      venta_items: {
        Row: {
          id: number
          venta_id: number
          producto_id: number | null
          nombre_producto: string
          cantidad: number
          precio_venta_unitario: number
          precio_costo_unitario: number
          subtotal: number
          ganancia_unitaria: number
          ganancia_subtotal: number
        }
        Insert: {
          id?: never
          venta_id: number
          producto_id?: number | null
          nombre_producto: string
          cantidad: number
          precio_venta_unitario: number
          precio_costo_unitario: number
          subtotal?: never
          ganancia_unitaria?: never
          ganancia_subtotal?: never
        }
        Update: {
          id?: never
          venta_id?: number
          producto_id?: number | null
          nombre_producto?: string
          cantidad?: number
          precio_venta_unitario?: number
          precio_costo_unitario?: number
          subtotal?: never
          ganancia_unitaria?: never
          ganancia_subtotal?: never
        }
        Relationships: [
          {
            foreignKeyName: 'venta_items_venta_id_fkey'
            columns: ['venta_id']
            isOneToOne: false
            referencedRelation: 'ventas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'venta_items_producto_id_fkey'
            columns: ['producto_id']
            isOneToOne: false
            referencedRelation: 'productos'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      registrar_pago_venta: {
        Args: {
          p_venta_id: number
          p_abono: number
        }
        Returns: Json
      }
      registrar_venta: {
        Args: {
          p_cliente_id: number
          p_monto_ingresado: number
          p_items: Json
          p_descuento?: number
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
