/**
 * Instagram Graph API Client
 * Uses official Instagram Graph API for business accounts
 * Handles sending/receiving DMs, processing messages, and extracting URLs
 */

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0'
const INSTAGRAM_GRAPH_API_BASE = 'https://graph.instagram.com'

export interface InstagramGraphAPIError {
  error: {
    message: string
    type: string
    code: number
  }
}

export class InstagramGraphAPIClient {
  private accessToken: string
  private appId: string
  private appSecret: string
  private igUserId: string | null

  constructor(accessToken: string, appId?: string, appSecret?: string, igUserId?: string) {
    this.accessToken = accessToken
    this.appId = appId || process.env.INSTAGRAM_APP_ID || ''
    this.appSecret = appSecret || process.env.INSTAGRAM_APP_SECRET || ''
    this.igUserId = igUserId || null
  }

  /**
   * Exchange short-lived token for long-lived token (60 days)
   */
  async exchangeForLongLivedToken(shortLivedToken: string): Promise<{ access_token: string; expires_in: number } | InstagramGraphAPIError> {
    try {
      const response = await fetch(
        `${GRAPH_API_BASE}/oauth/access_token?` +
        `grant_type=fb_exchange_token&` +
        `client_id=${this.appId}&` +
        `client_secret=${this.appSecret}&` +
        `fb_exchange_token=${shortLivedToken}`
      )

      const data = await response.json()
      
      if (!response.ok) {
        return data as InstagramGraphAPIError
      }

      return data as { access_token: string; expires_in: number }
    } catch (error) {
      return {
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          type: 'NetworkError',
          code: 0
        }
      }
    }
  }

  /**
   * Get Instagram Business Account information
   */
  async getAccountInfo(): Promise<any> {
    if (!this.igUserId) {
      // Try to get from /me endpoint
      const response = await fetch(
        `${INSTAGRAM_GRAPH_API_BASE}/me?fields=id,username,name,profile_picture_url,biography,website,follows_count,followers_count,media_count&access_token=${this.accessToken}`
      )
      return await response.json()
    }

    const response = await fetch(
      `${GRAPH_API_BASE}/${this.igUserId}?fields=id,username,name,profile_picture_url,biography,website,follows_count,followers_count,media_count&access_token=${this.accessToken}`
    )
    return await response.json()
  }

  /**
   * Get conversations (DM threads)
   */
  async getConversations(limit: number = 25): Promise<any> {
    if (!this.igUserId) {
      return {
        error: {
          message: 'Instagram Business Account ID not configured',
          type: 'ConfigurationError',
          code: 400
        }
      }
    }

    const response = await fetch(
      `${GRAPH_API_BASE}/${this.igUserId}/conversations?` +
      `fields=id,participants,updated_time,message_count,snippet,unread_count&` +
      `limit=${Math.min(limit, 25)}&` +
      `access_token=${this.accessToken}`
    )

    return await response.json()
  }

  /**
   * Get messages from a conversation
   */
  async getMessages(conversationId: string, limit: number = 25): Promise<any> {
    const response = await fetch(
      `${GRAPH_API_BASE}/${conversationId}/messages?` +
      `fields=id,from,to,message,created_time,attachments&` +
      `limit=${Math.min(limit, 25)}&` +
      `access_token=${this.accessToken}`
    )

    return await response.json()
  }

  /**
   * Send a message to a user by their Instagram user ID
   * Note: The recipient must have messaged your business account first,
   * or you need their user ID from a previous conversation
   */
  async sendMessage(recipientId: string, message: string): Promise<any> {
    if (!this.igUserId) {
      return {
        error: {
          message: 'Instagram Business Account ID not configured',
          type: 'ConfigurationError',
          code: 400
        }
      }
    }

    // Graph API requires access token as query parameter
    const url = new URL(`${GRAPH_API_BASE}/${this.igUserId}/messages`)
    url.searchParams.set('access_token', this.accessToken)
    
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: message }
      })
    })

    return await response.json()
  }

  /**
   * Find user ID from username by searching conversations
   * Graph API doesn't support direct username lookup, so we search through conversations
   */
  async findUserIdFromUsername(username: string): Promise<string | null> {
    try {
      // Get all conversations
      const conversations = await this.getConversations(100)
      
      if (conversations.error) {
        return null
      }

      // Search through participants in conversations
      const convs = conversations.data || []
      for (const conv of convs) {
        const participants = conv.participants?.data || []
        for (const participant of participants) {
          if (participant.username === username) {
            return participant.id
          }
        }
      }

      return null
    } catch (error) {
      console.error('Error finding user ID from username:', error)
      return null
    }
  }

  /**
   * Send message to a user by username
   * First finds the user ID, then sends the message
   */
  async sendMessageByUsername(username: string, message: string): Promise<any> {
    // First, try to find the user ID from conversations
    const userId = await this.findUserIdFromUsername(username)
    
    if (!userId) {
      return {
        error: {
          message: `User ${username} not found in conversations. They must message your business account first.`,
          type: 'UserNotFound',
          code: 404
        }
      }
    }

    return await this.sendMessage(userId, message)
  }

  /**
   * Get unread conversations (conversations with unread messages)
   */
  async getUnreadConversations(limit: number = 25): Promise<any> {
    if (!this.igUserId) {
      return {
        error: {
          message: 'Instagram Business Account ID not configured',
          type: 'ConfigurationError',
          code: 400
        }
      }
    }

    const response = await fetch(
      `${GRAPH_API_BASE}/${this.igUserId}/conversations?` +
      `fields=id,participants,updated_time,message_count,snippet,unread_count&` +
      `limit=${Math.min(limit, 25)}&` +
      `access_token=${this.accessToken}`
    )

    const data = await response.json()
    
    if (data.error) {
      return data
    }

    // Filter to only unread conversations
    const unreadConvs = (data.data || []).filter((conv: any) => (conv.unread_count || 0) > 0)
    
    return {
      ...data,
      data: unreadConvs
    }
  }

  /**
   * Get all unread messages across all conversations
   */
  async getUnreadMessages(limit: number = 50): Promise<any> {
    try {
      const conversations = await this.getUnreadConversations(100)
      
      if (conversations.error) {
        return conversations
      }

      const allMessages: any[] = []
      const convs = conversations.data || []

      for (const conv of convs) {
        const messages = await this.getMessages(conv.id, 25)
        
        if (messages.error) {
          continue
        }

        // Filter unread messages (messages where from.id !== igUserId)
        const unreadMsgs = (messages.data || []).filter((msg: any) => {
          return msg.from?.id !== this.igUserId
        })

        // Add conversation context to each message
        for (const msg of unreadMsgs) {
          const sender = conv.participants?.data?.find((p: any) => p.id === msg.from?.id)
          allMessages.push({
            ...msg,
            conversation_id: conv.id,
            sender_username: sender?.username || sender?.name || 'unknown',
            sender_id: msg.from?.id,
            unread_count: conv.unread_count
          })
        }

        if (allMessages.length >= limit) {
          break
        }
      }

      return {
        data: allMessages.slice(0, limit),
        count: allMessages.length
      }
    } catch (error) {
      return {
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          type: 'ProcessingError',
          code: 500
        }
      }
    }
  }

  /**
   * Extract URLs from message text
   */
  static extractUrlsFromText(text: string): string[] {
    if (!text) return []

    // URL regex pattern
    const urlPattern = /http[s]?:\/\/(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+/g
    const urlMatches = text.match(urlPattern)
    const urls: string[] = urlMatches ? [...urlMatches] : []

    // Also look for instagram.com links without protocol
    const instagramPattern = /(?:www\.)?instagram\.com\/[^\s]+/g
    const instagramMatches = text.match(instagramPattern)
    const instagramUrls: string[] = instagramMatches ? [...instagramMatches] : []
    
    for (const url of instagramUrls) {
      if (!url.startsWith('http')) {
        urls.push('https://' + url)
      }
    }

    return [...new Set(urls)] // Remove duplicates
  }

  /**
   * Extract URLs from message attachments (shared posts/reels)
   * Graph API provides attachment data in the message
   */
  static extractUrlsFromAttachments(message: any): string[] {
    const urls: string[] = []
    
    if (!message.attachments?.data) {
      return urls
    }

    for (const attachment of message.attachments.data) {
      // Check for shared post/reel
      if (attachment.type === 'share' && attachment.url) {
        urls.push(attachment.url)
      }
      
      // Check for media attachments with URLs
      if (attachment.media?.image?.src) {
        urls.push(attachment.media.image.src)
      }
      
      // Instagram shared posts might be in subattachments
      if (attachment.subattachments?.data) {
        for (const sub of attachment.subattachments.data) {
          if (sub.url) {
            urls.push(sub.url)
          }
        }
      }
    }

    return urls
  }

  /**
   * Extract all URLs from a message (text + attachments)
   */
  static extractAllUrls(message: any): string[] {
    const textUrls = this.extractUrlsFromText(message.message || '')
    const attachmentUrls = this.extractUrlsFromAttachments(message)
    
    const allUrls = [...textUrls, ...attachmentUrls]
    return [...new Set(allUrls)]
  }
}

