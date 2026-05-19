type MessageHandler = (message: any) => Promise<void> | void;
type CallbackHandler = (query: any) => Promise<void> | void;

const setupAdminModule = () => {
  const handlers: {
    message?: MessageHandler;
    edited_message?: MessageHandler;
    callback_query?: CallbackHandler;
  } = {};

  const topic = {
    user_id: '42',
    topic_id: '77',
    assigned_to: '500',
    answered: false,
    last_message_time: 1,
    message_pairs: [] as [string, string][],
  };

  const Telegram = {
    data: { groupId: '100' },
    topics: [topic],
    HandleMessage: jest.fn((cb: MessageHandler) => {
      handlers.message = cb;
    }),
    on: jest.fn((event: string, cb: MessageHandler | CallbackHandler) => {
      if (event === 'edited_message') handlers.edited_message = cb as MessageHandler;
      if (event === 'callback_query') handlers.callback_query = cb as CallbackHandler;
    }),
    sendMessage: jest.fn(() => Promise.resolve({ message_id: 901 })),
    copyMessage: jest.fn(() => Promise.resolve({ message_id: 902 })),
    UpdateTopicInfo: jest.fn(),
    deleteForumTopic: jest.fn(() => Promise.resolve(true)),
    getChat: jest.fn(() => Promise.resolve({ username: 'owner' })),
    syncMessage: jest.fn(),
    answerCallbackQuery: jest.fn(() => Promise.resolve(true)),
    AssignTopic: jest.fn(() => Promise.resolve('assigned')),
    MarkTopicDone: jest.fn(() => Promise.resolve('done')),
    BlockUser: jest.fn(() => Promise.resolve('blocked')),
    SendTopicInfo: jest.fn(() => Promise.resolve('info')),
    EndDialog: jest.fn(() => Promise.resolve('ended')),
  };

  const LangString = jest.fn((key: string, ...args: unknown[]) => {
    return `L:${key}:${args.join('|')}`;
  });

  const GenerateInlineKeyboard = jest.fn(() => [
    [{ text: 'key', callback_data: 'ASSIGN' }],
  ]);

  jest.doMock('./telegram', () => ({ Telegram }));
  jest.doMock('./lang', () => ({ LangString }));
  jest.doMock('./keycontrol', () => ({
    AdminKeys: {
      ASSIGN: 'topic.key.assign',
      BLOCK: 'topic.key.block',
      INFO: 'topic.info',
      MARK_DONE: 'topic.key.markDone',
      END_DIALOG: 'topic.key.client.endDialog',
    },
    GenerateInlineKeyboard,
  }));

  jest.isolateModules(() => {
    require('./admin');
  });

  return {
    handlers,
    Telegram,
    topic,
    LangString,
    GenerateInlineKeyboard,
  };
};

describe('admin module', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.useRealTimers();
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('ignores messages outside support group', async () => {
    const { handlers, Telegram } = setupAdminModule();

    await handlers.message?.({
      chat: { id: '42' },
      from: { id: 500, is_bot: false },
      message_id: 10,
      message_thread_id: 77,
    });

    expect(Telegram.copyMessage).not.toHaveBeenCalled();
  });

  it('reports missing topic and schedules topic deletion', async () => {
    const { handlers, Telegram } = setupAdminModule();
    Telegram.topics = [];

    await handlers.message?.({
      chat: { id: '100' },
      from: { id: 500, is_bot: false },
      message_id: 11,
      message_thread_id: 77,
    });

    expect(Telegram.sendMessage).toHaveBeenCalledWith(
      '100',
      'L:topic.message.admin.dialogNotExist:',
      expect.objectContaining({
        reply_to_message_id: 11,
        message_thread_id: 77,
      })
    );

    jest.runAllTimers();

    expect(Telegram.deleteForumTopic).toHaveBeenCalledWith('100', 77);
  });

  it('warns when admin is not assigned owner and still forwards message', async () => {
    const { handlers, Telegram, topic } = setupAdminModule();

    await handlers.message?.({
      chat: { id: '100' },
      from: { id: 123, is_bot: false },
      text: 'admin-text',
      message_id: 12,
      message_thread_id: 77,
    });

    expect(Telegram.sendMessage).toHaveBeenCalledWith(
      '100',
      expect.stringContaining('L:topic.message.admin.notYour:'),
      expect.objectContaining({ message_thread_id: 77 })
    );
    expect(Telegram.copyMessage).toHaveBeenCalled();
    expect(Telegram.UpdateTopicInfo).toHaveBeenCalledWith(topic);
  });

  it('syncs edited admin messages for existing topic', () => {
    const { handlers, Telegram } = setupAdminModule();

    handlers.edited_message?.({
      chat: { id: '100' },
      from: { id: 500, is_bot: false },
      message_id: 13,
      message_thread_id: 77,
    });

    expect(Telegram.syncMessage).toHaveBeenCalledWith(
      expect.objectContaining({ message_id: 13 }),
      '77'
    );
  });

  it('routes callback ASSIGN to AssignTopic and answers callback query', async () => {
    const { handlers, Telegram } = setupAdminModule();

    await handlers.callback_query?.({
      id: 'cb-admin-1',
      data: 'ASSIGN',
      from: { id: 500, is_bot: false },
      message: {
        chat: { id: '100' },
        message_thread_id: 77,
        message_id: 14,
      },
    });

    expect(Telegram.AssignTopic).toHaveBeenCalledWith(
      expect.objectContaining({ message_id: 14 }),
      500
    );
    expect(Telegram.answerCallbackQuery).toHaveBeenCalledWith('cb-admin-1', {
      show_alert: true,
      text: 'assigned',
    });
  });
});
