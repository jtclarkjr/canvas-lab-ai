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
          updated_at: string
          visibility: Database['public']['Enums']['canvas_visibility']
          icon_path: string | null
        }
        Insert: {
          id?: string
          title: string
          created_by: string
          created_at?: string
          updated_at?: string
          visibility?: Database['public']['Enums']['canvas_visibility']
          icon_path?: string | null
        }
        Update: {
          id?: string
          title?: string
          created_by?: string
          created_at?: string
          updated_at?: string
          visibility?: Database['public']['Enums']['canvas_visibility']
          icon_path?: string | null
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
      canvas_history: {
        Row: {
          id: string
          canvas_id: string
          action: Database['public']['Enums']['canvas_history_action']
          element_id: string
          element_type: string
          command_type: string | null
          actor_id: string | null
          actor_name: string | null
          actor_email: string | null
          actor_image: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          canvas_id: string
          action: Database['public']['Enums']['canvas_history_action']
          element_id: string
          element_type: string
          command_type?: string | null
          actor_id?: string | null
          actor_name?: string | null
          actor_email?: string | null
          actor_image?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          canvas_id?: string
          action?: Database['public']['Enums']['canvas_history_action']
          element_id?: string
          element_type?: string
          command_type?: string | null
          actor_id?: string | null
          actor_name?: string | null
          actor_email?: string | null
          actor_image?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'canvas_history_canvas_id_fkey'
            columns: ['canvas_id']
            isOneToOne: false
            referencedRelation: 'canvases'
            referencedColumns: ['id']
          }
        ]
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
          rotation: number
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
          rotation?: number
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
          rotation?: number
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
      canvas_workflows: {
        Row: {
          id: string
          canvas_id: string
          title: string
          x: number
          y: number
          width: number
          height: number
          rotation: number
          definition: Json
          config_yaml: string
          notes: string
          settings: Json
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          canvas_id: string
          title?: string
          x?: number
          y?: number
          width?: number
          height?: number
          rotation?: number
          definition?: Json
          config_yaml?: string
          notes?: string
          settings?: Json
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          canvas_id?: string
          title?: string
          x?: number
          y?: number
          width?: number
          height?: number
          rotation?: number
          definition?: Json
          config_yaml?: string
          notes?: string
          settings?: Json
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'canvas_workflows_canvas_id_fkey'
            columns: ['canvas_id']
            isOneToOne: false
            referencedRelation: 'canvases'
            referencedColumns: ['id']
          }
        ]
      }
      canvas_workflow_versions: {
        Row: {
          id: string
          workflow_id: string
          canvas_id: string
          title: string
          definition: Json
          config_yaml: string
          notes: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workflow_id: string
          canvas_id: string
          title?: string
          definition: Json
          config_yaml?: string
          notes?: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workflow_id?: string
          canvas_id?: string
          title?: string
          definition?: Json
          config_yaml?: string
          notes?: string
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'canvas_workflow_versions_workflow_id_fkey'
            columns: ['workflow_id']
            isOneToOne: false
            referencedRelation: 'canvas_workflows'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'canvas_workflow_versions_canvas_id_fkey'
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
      canvas_assistant_threads: {
        Row: {
          id: string
          canvas_id: string
          user_id: string
          title: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          canvas_id: string
          user_id: string
          title?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          canvas_id?: string
          user_id?: string
          title?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'canvas_assistant_threads_canvas_id_fkey'
            columns: ['canvas_id']
            isOneToOne: false
            referencedRelation: 'canvases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'canvas_assistant_threads_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      canvas_assistant_messages: {
        Row: {
          id: string
          thread_id: string
          canvas_id: string
          user_id: string
          role: string
          parts: Json
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id: string
          thread_id: string
          canvas_id: string
          user_id: string
          role: string
          parts?: Json
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          thread_id?: string
          canvas_id?: string
          user_id?: string
          role?: string
          parts?: Json
          metadata?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'canvas_assistant_messages_thread_id_fkey'
            columns: ['thread_id']
            isOneToOne: false
            referencedRelation: 'canvas_assistant_threads'
            referencedColumns: ['id']
          },
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
      canvas_call_sessions: {
        Row: {
          id: string
          canvas_id: string
          room_name: string
          livekit_room_sid: string | null
          started_by: string | null
          started_by_name: string | null
          started_at: string
          ended_at: string | null
          transcript_status: Database['public']['Enums']['canvas_call_transcript_status']
          transcript_attempt: number
          transcript_error_code:
            | Database['public']['Enums']['canvas_call_transcript_error_code']
            | null
          transcript_enabled_by: string | null
          transcript_enabled_at: string | null
          transcript_agent_dispatch_id: string | null
          transcript_agent_name: string | null
          transcript_agent_job_id: string | null
          transcript_model: string | null
          transcript_accepted_at: string | null
          transcript_first_audio_at: string | null
          transcript_first_segment_at: string | null
          transcript_completed_at: string | null
          error_message: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          canvas_id: string
          room_name: string
          livekit_room_sid?: string | null
          started_by?: string | null
          started_by_name?: string | null
          started_at?: string
          ended_at?: string | null
          transcript_status?: Database['public']['Enums']['canvas_call_transcript_status']
          transcript_attempt?: number
          transcript_error_code?:
            | Database['public']['Enums']['canvas_call_transcript_error_code']
            | null
          transcript_enabled_by?: string | null
          transcript_enabled_at?: string | null
          transcript_agent_dispatch_id?: string | null
          transcript_agent_name?: string | null
          transcript_agent_job_id?: string | null
          transcript_model?: string | null
          transcript_accepted_at?: string | null
          transcript_first_audio_at?: string | null
          transcript_first_segment_at?: string | null
          transcript_completed_at?: string | null
          error_message?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          canvas_id?: string
          room_name?: string
          livekit_room_sid?: string | null
          started_by?: string | null
          started_by_name?: string | null
          started_at?: string
          ended_at?: string | null
          transcript_status?: Database['public']['Enums']['canvas_call_transcript_status']
          transcript_attempt?: number
          transcript_error_code?:
            | Database['public']['Enums']['canvas_call_transcript_error_code']
            | null
          transcript_enabled_by?: string | null
          transcript_enabled_at?: string | null
          transcript_agent_dispatch_id?: string | null
          transcript_agent_name?: string | null
          transcript_agent_job_id?: string | null
          transcript_model?: string | null
          transcript_accepted_at?: string | null
          transcript_first_audio_at?: string | null
          transcript_first_segment_at?: string | null
          transcript_completed_at?: string | null
          error_message?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'canvas_call_sessions_canvas_id_fkey'
            columns: ['canvas_id']
            isOneToOne: false
            referencedRelation: 'canvases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'canvas_call_sessions_started_by_fkey'
            columns: ['started_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'canvas_call_sessions_transcript_enabled_by_fkey'
            columns: ['transcript_enabled_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      canvas_call_artifacts: {
        Row: {
          id: string
          session_id: string
          canvas_id: string
          kind: Database['public']['Enums']['canvas_call_artifact_kind']
          status: Database['public']['Enums']['canvas_call_artifact_status']
          title: string | null
          storage_bucket: string | null
          storage_path: string | null
          mime_type: string | null
          size_bytes: number | null
          metadata: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          canvas_id: string
          kind: Database['public']['Enums']['canvas_call_artifact_kind']
          status?: Database['public']['Enums']['canvas_call_artifact_status']
          title?: string | null
          storage_bucket?: string | null
          storage_path?: string | null
          mime_type?: string | null
          size_bytes?: number | null
          metadata?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          canvas_id?: string
          kind?: Database['public']['Enums']['canvas_call_artifact_kind']
          status?: Database['public']['Enums']['canvas_call_artifact_status']
          title?: string | null
          storage_bucket?: string | null
          storage_path?: string | null
          mime_type?: string | null
          size_bytes?: number | null
          metadata?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'canvas_call_artifacts_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'canvas_call_sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'canvas_call_artifacts_canvas_id_fkey'
            columns: ['canvas_id']
            isOneToOne: false
            referencedRelation: 'canvases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'canvas_call_artifacts_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      canvas_call_participants: {
        Row: {
          id: string
          session_id: string
          canvas_id: string
          user_id: string
          participant_identity: string
          participant_name: string | null
          participant_sid: string | null
          joined_at: string
          last_seen_at: string
          left_at: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          canvas_id: string
          user_id: string
          participant_identity: string
          participant_name?: string | null
          participant_sid?: string | null
          joined_at?: string
          last_seen_at?: string
          left_at?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          canvas_id?: string
          user_id?: string
          participant_identity?: string
          participant_name?: string | null
          participant_sid?: string | null
          joined_at?: string
          last_seen_at?: string
          left_at?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'canvas_call_participants_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'canvas_call_sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'canvas_call_participants_canvas_id_fkey'
            columns: ['canvas_id']
            isOneToOne: false
            referencedRelation: 'canvases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'canvas_call_participants_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      canvas_call_transcript_segments: {
        Row: {
          id: string
          session_id: string
          canvas_id: string
          position: number
          speaker_identity: string
          speaker_name: string | null
          speaker_sid: string | null
          text: string
          language: string | null
          provider: string | null
          model: string | null
          start_time_seconds: number | null
          end_time_seconds: number | null
          confidence: number | null
          words: Json | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          canvas_id: string
          position: number
          speaker_identity: string
          speaker_name?: string | null
          speaker_sid?: string | null
          text: string
          language?: string | null
          provider?: string | null
          model?: string | null
          start_time_seconds?: number | null
          end_time_seconds?: number | null
          confidence?: number | null
          words?: Json | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          canvas_id?: string
          position?: number
          speaker_identity?: string
          speaker_name?: string | null
          speaker_sid?: string | null
          text?: string
          language?: string | null
          provider?: string | null
          model?: string | null
          start_time_seconds?: number | null
          end_time_seconds?: number | null
          confidence?: number | null
          words?: Json | null
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'canvas_call_transcript_segments_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'canvas_call_sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'canvas_call_transcript_segments_canvas_id_fkey'
            columns: ['canvas_id']
            isOneToOne: false
            referencedRelation: 'canvases'
            referencedColumns: ['id']
          }
        ]
      }
      prompt_ai_usage_events: {
        Row: {
          id: string
          user_id: string
          feature: string
          model_id: string
          input_tokens: number
          output_tokens: number
          total_tokens: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          feature: string
          model_id: string
          input_tokens?: number
          output_tokens?: number
          total_tokens: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          feature?: string
          model_id?: string
          input_tokens?: number
          output_tokens?: number
          total_tokens?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'prompt_ai_usage_events_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      claim_canvas_call_transcription: {
        Args: {
          p_session_id: string
          p_enabled_by: string
          p_agent_name: string
          p_model: string
        }
        Returns: boolean
      }
      close_canvas_call_session: {
        Args: {
          p_session_id: string
          p_ended_at?: string
        }
        Returns: boolean
      }
      transition_canvas_call_transcript: {
        Args: {
          p_session_id: string
          p_attempt: number
          p_status: Database['public']['Enums']['canvas_call_transcript_status']
          p_error_code?:
            | Database['public']['Enums']['canvas_call_transcript_error_code']
            | null
          p_error_message?: string | null
          p_dispatch_id?: string | null
          p_agent_job_id?: string | null
          p_segment_count?: number | null
          p_mark_accepted?: boolean
          p_mark_first_audio?: boolean
          p_mark_first_segment?: boolean
          p_mark_completed?: boolean
        }
        Returns: boolean
      }
    }
    Enums: {
      canvas_role: 'admin' | 'editor' | 'reader'
      access_request_status: 'pending' | 'approved' | 'denied'
      canvas_visibility: 'private' | 'public'
      canvas_history_action:
        | 'created'
        | 'modified'
        | 'deleted'
        | 'undo'
        | 'redo'
      canvas_call_transcript_status:
        | 'not_requested'
        | 'starting'
        | 'active'
        | 'processing'
        | 'ready'
        | 'no_speech'
        | 'failed'
      canvas_call_transcript_error_code:
        | 'agent_unavailable'
        | 'agent_connect_failed'
        | 'dispatch_failed'
        | 'no_audio_received'
        | 'no_speech_detected'
        | 'stt_failed'
        | 'finalization_timeout'
        | 'worker_did_not_finalize'
      canvas_call_artifact_kind: 'transcript' | 'recording' | 'summary'
      canvas_call_artifact_status: 'processing' | 'ready' | 'failed'
    }
  }
}
