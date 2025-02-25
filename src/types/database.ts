export type Database = {
  public: {
    Tables: {
      tab_stash: {
        Row: {
          id: string
          created_at: string
          url: string
          price: string
          description: string
          photos: string[]
          user_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          url: string
          price: string
          description: string
          photos?: string[]
          user_id: string
        }
        Update: {
          id?: string
          created_at?: string
          url?: string
          price?: string
          description?: string
          photos?: string[]
          user_id?: string
        }
      }
    }
    Views: {
      // Define your views here
    }
    Functions: {
      // Define your functions here
    }
  }
}

