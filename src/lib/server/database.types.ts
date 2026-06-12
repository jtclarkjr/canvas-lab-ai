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
          visibility: Database['public']['Enums']['canvas_visibility']
        }
        Insert: {
          id?: string
          title: string
          created_by: string
          created_at?: string
          visibility?: Database['public']['Enums']['canvas_visibility']
        }
        Update: {
          id?: string
          title?: string
          created_by?: string
          created_at?: string
          visibility?: Database['public']['Enums']['canvas_visibility']
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
          requested_role: Database['public']['Enums']['canvas_role'] | null
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
          requested_role?: Database['public']['Enums']['canvas_role'] | null
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
          requested_role?: Database['public']['Enums']['canvas_role'] | null
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
      canvas_scenes: {
        Row: {
          id: string
          canvas_id: string
          type: string
          title: string
          x: number
          y: number
          width: number
          height: number
          settings: Json
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          canvas_id: string
          type?: string
          title?: string
          x?: number
          y?: number
          width?: number
          height?: number
          settings?: Json
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          canvas_id?: string
          type?: string
          title?: string
          x?: number
          y?: number
          width?: number
          height?: number
          settings?: Json
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'canvas_scenes_canvas_id_fkey'
            columns: ['canvas_id']
            isOneToOne: false
            referencedRelation: 'canvases'
            referencedColumns: ['id']
          }
        ]
      }
      canvas_scene_documents: {
        Row: {
          id: string
          scene_id: string
          canvas_id: string
          kind: string
          status: string
          title: string
          content: Json
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          scene_id: string
          canvas_id: string
          kind?: string
          status?: string
          title?: string
          content?: Json
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          scene_id?: string
          canvas_id?: string
          kind?: string
          status?: string
          title?: string
          content?: Json
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'canvas_scene_documents_scene_id_fkey'
            columns: ['scene_id']
            isOneToOne: false
            referencedRelation: 'canvas_scenes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'canvas_scene_documents_canvas_id_fkey'
            columns: ['canvas_id']
            isOneToOne: false
            referencedRelation: 'canvases'
            referencedColumns: ['id']
          }
        ]
      }
      canvas_scene_messages: {
        Row: {
          id: string
          scene_id: string
          canvas_id: string
          document_id: string | null
          role: string
          parts: Json
          metadata: Json | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          scene_id: string
          canvas_id: string
          document_id?: string | null
          role: string
          parts?: Json
          metadata?: Json | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          scene_id?: string
          canvas_id?: string
          document_id?: string | null
          role?: string
          parts?: Json
          metadata?: Json | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'canvas_scene_messages_scene_id_fkey'
            columns: ['scene_id']
            isOneToOne: false
            referencedRelation: 'canvas_scenes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'canvas_scene_messages_canvas_id_fkey'
            columns: ['canvas_id']
            isOneToOne: false
            referencedRelation: 'canvases'
            referencedColumns: ['id']
          }
        ]
      }
      canvas_chat_messages: {
        Row: {
          id: string
          canvas_id: string
          content: string
          metadata: Json | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          canvas_id: string
          content: string
          metadata?: Json | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          canvas_id?: string
          content?: string
          metadata?: Json | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'canvas_chat_messages_canvas_id_fkey'
            columns: ['canvas_id']
            isOneToOne: false
            referencedRelation: 'canvases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'canvas_chat_messages_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      canvas_assistant_messages: {
        Row: {
          id: string
          canvas_id: string
          user_id: string
          role: string
          parts: Json
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id: string
          canvas_id: string
          user_id: string
          role: string
          parts?: Json
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          canvas_id?: string
          user_id?: string
          role?: string
          parts?: Json
          metadata?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'canvas_assistant_messages_canvas_id_fkey'
            columns: ['canvas_id']
            isOneToOne: false
            referencedRelation: 'canvases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'canvas_assistant_messages_user_id_fkey'
            columns: ['user_id']
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
      canvas_visibility: 'private' | 'public'
    }
  }
}
