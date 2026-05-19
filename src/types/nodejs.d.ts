// ⚠️ AUTO-GENERATED FILE — DO NOT EDIT
// Source: .env.defaults
// Generated: 2026-05-19T22:13:58

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * Telegram Bot Configuration. You need to create a bot using BotFather on Telegram and get the token, then add it here.
     */
    TELEGRAM_BOT_TOKEN: string;
    /**
     * Telegram group ID where support topics will be posted (use a negative number for supergroups)
     */
    TELEGRAM_GROUP_ID: string;
    /**
     * System language for messages (e.g., 'en' for English, 'uk' for Ukrainian, 'ru' for Russian)
     */
    LANG: string;
    /**
     * Set to true to remove system messages (like "topic edited") from the Telegram group
     */
    REMOVE_SYSTEM_MESSAGES: string;
    /**
     * Set to true to keep closed topics in storage (they will be marked as closed but not deleted)
     */
    KEEP_CLOSED_TOPICS: string;
    /**
     * Maximum number of topics to keep in storage. Older topics will be deleted when this limit is exceeded. If limit is reached, the oldest topic will be deleted to make room for new ones. If active topics exceed this limit, new topics will not be created until some are closed and deleted.
     */
    TOPIC_LIMITS: string;
  }
}


