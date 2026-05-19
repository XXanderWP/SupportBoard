export const StorageDefault = {
  topics: [] as {
    user_id: string;
    topic_id: string;
    user_login?: string;
    answered: boolean;
    last_message_time: number;
    assigned_to?: string;
    /** Admin who blocked the client, if not present the client is not blocked */
    blocked_by?: string;
    /** True if client has blocked bot or removed account */
    deleted?: boolean;
    /** True if admin is currently writing a message */
    writing_admin?: boolean;
    /** True if client is currently writing a message */
    writing_client?: boolean;
    /** Array of message pairs [original_message_id, copy_message_id] */
    message_pairs: [string, string][];
  }[],
  /** Array of topic IDs to be removed */
  removeTopics: [] as string[],
};
