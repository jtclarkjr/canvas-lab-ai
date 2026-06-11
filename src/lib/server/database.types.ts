export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]

export interface Database {
  public: {
    Tables: {
      canvases: {
        Row: {
          id: string
          title: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          created_by?: string
          created_at?: string
        }
        Relationships: []
      }
      canvas_elements: {
        Row: {
          id: string
          canvas_id: string
          type: string
          data: Json | null
          x: number
          y: number
          z: number | null
          created_by: string | null
          updated_by: string
          updated_at: string
        }
        Insert: {
          id?: string
          canvas_id: string
          type: string
          data?: Json | null
          x: number
          y: number
          z?: number | null
          created_by?: string | null
          updated_by: string
          updated_at?: string
        }
        Update: {
          id?: string
          canvas_id?: string
          type?: string
          data?: Json | null
          x?: number
          y?: number
          z?: number | null
          created_by?: string | null
          updated_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          avatar_url: string | null
          avatar_color: string | null
          last_seen: string | null
          created_at: string | null
          updated_at: string
        }
        Insert: {
          id: string
          email?: string
          display_name?: string | null
          avatar_url?: string | null
          avatar_color?: string | null
          last_seen?: string | null
          created_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          avatar_url?: string | null
          avatar_color?: string | null
          last_seen?: string | null
          created_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      canvas_members: {
        Row: {
          id: string
          canvas_id: string
          user_id: string
          role: Database['public']['Enums']['canvas_role']
          invited_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          canvas_id: string
          user_id: string
          role?: Database['public']['Enums']['canvas_role']
          invited_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          canvas_id?: string
          user_id?: string
          role?: Database['public']['Enums']['canvas_role']
          invited_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'canvas_members_canvas_id_fkey'
            columns: ['canvas_id']
            isOneToOne: false
            referencedRelation: 'canvases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'canvas_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      canvas_access_requests: {
        Row: {
          id: string
          canvas_id: string
          requester_id: string
          status: Database['public']['Enums']['access_request_status']
          resolved_by: string | null
          resolved_role: Database['public']['Enums']['canvas_role'] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          canvas_id: string
          requester_id: string
          status?: Database['public']['Enums']['access_request_status']
          resolved_by?: string | null
          resolved_role?: Database['public']['Enums']['canvas_role'] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          canvas_id?: string
          requester_id?: string
          status?: Database['public']['Enums']['access_request_status']
          resolved_by?: string | null
          resolved_role?: Database['public']['Enums']['canvas_role'] | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'canvas_access_requests_canvas_id_fkey'
            columns: ['canvas_id']
            isOneToOne: false
            referencedRelation: 'canvases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'canvas_access_requests_requester_id_fkey'
            columns: ['requester_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      canvas_role: 'admin' | 'editor' | 'reader'
      access_request_status: 'pending' | 'approved' | 'denied'
    }
  }
}
