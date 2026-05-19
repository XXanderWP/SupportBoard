type MessageHandler = (message: any) => Promise<void> | void;
type CallbackHandler = (query: any) => Promise<void> | void;

const setupClientModule = () => {
  const handlers: {
    message?: MessageHandler;
    edited_message?: MessageHandler;
    callback_query?: CallbackHandler;
  } = {};

  const Telegram = {
    data: { groupId: '100' },
    HandleMessage: jest.fn((cb: MessageHandler) => {
      handlers.message = cb;
    }),
    on: jest.fn((event: string, cb: MessageHandler | CallbackHandler) => {
      if (event === 'edited_message') handlers.edited_message = cb as MessageHandler;
      if (event === 'callback_query') handlers.callback_query = cb as CallbackHandler;
    }),
    GetTopicIdByUserId: jest.fn(),
    CreateTopic: jest.fn(),
    sendMessage: jest.fn(() => Promise.resolve({ message_id: 900 })),
    copyMessage: jest.fn(() => Promise.resolve({ message_id: 901 })),
    UpdateTopicInfo: jest.fn(),
    answerCallbackQuery: jest.fn(() => Promise.resolve(true)),
    EndDialog: jest.fn(() => Promise.resolve('dialog-ended')),
    syncMessage: jest.fn(),
  };

  const LangString = jest.fn((key: string, ...args: unknown[]) => {
    return `L:${key}:${args.join('|')}`;
  });

  const GenerateInlineKeyboard = jest.fn(() => [
    [{ text: 'key', callback_data: 'END_DIALOG' }],
  ]);

  const sleep = jest.fn(() => Promise.resolve());

  jest.doMock('./telegram', () => ({ Telegram }));
  jest.doMock('./lang', () => ({ LangString }));
  jest.doMock('./keycontrol', () => ({
    GenerateInlineKeyboard,
    UsersKeys: {
      END_DIALOG: 'topic.key.client.endDialog',
    },
  }));
  jest.doMock('@xxanderwp/jstoolkit', () => ({ sleep }));

  jest.isolateModules(() => {
    require('./client');
  });

  return {
    handlers,
    Telegram,
    LangString,
    GenerateInlineKeyboard,
    sleep,
  };
};

describe('client module', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('handles /start without creating topic', async () => {
    const { handlers, Telegram } = setupClientModule();
    Telegram.GetTopicIdByUserId.mockReturnValue(undefined);

    await handlers.message?.({
      chat: { id: '42' },
      from: { id: 42 },
      text: '/start',
      message_id: 10,
    });

    expect(Telegram.CreateTopic).not.toHaveBeenCalled();
    expect(Telegram.sendMessage).toHaveBeenCalledWith(
      '42',
      'L:topic.message.client.create.startIgnore:',
      { reply_to_message_id: 10 }
    );
  });

  it('sends limit message when topic cannot be created', async () => {
    const { handlers, Telegram } = setupClientModule();
    Telegram.GetTopicIdByUserId.mockReturnValue(undefined);
    Telegram.CreateTopic.mockResolvedValue(undefined);

    await handlers.message?.({
      chat: { id: '42' },
      from: { id: 42 },
      text: 'hello',
      message_id: 11,
    });

    expect(Telegram.CreateTopic).toHaveBeenCalledTimes(1);
    expect(Telegram.sendMessage).toHaveBeenCalledWith(
      '42',
      'L:topic.message.client.create.limit:',
      { reply_to_message_id: 11 }
    );
  });

  it('falls back when copyMessage fails and updates topic info', async () => {
    const { handlers, Telegram } = setupClientModule();
    const topic = {
      user_id: '42',
      topic_id: '77',
      answered: true,
      last_message_time: 1,
      message_pairs: [] as [string, string][],
    };

    Telegram.GetTopicIdByUserId.mockReturnValue(topic);
    Telegram.copyMessage.mockRejectedValue(new Error('copy failed'));
    Telegram.sendMessage
      .mockResolvedValueOnce({ message_id: 222 })
      .mockResolvedValueOnce({ message_id: 333 });

    await handlers.message?.({
      chat: { id: '42' },
      from: { id: 42 },
      text: 'payload',
      message_id: 12,
    });

    expect(Telegram.UpdateTopicInfo).toHaveBeenCalledTimes(1);
    expect(topic.answered).toBe(false);
    expect(topic.message_pairs).toContainEqual(['12', '222']);
    expect(Telegram.sendMessage).toHaveBeenCalledWith(
      '42',
      'L:topic.failedCopyMessage:',
      expect.any(Object)
    );
    expect(Telegram.sendMessage).toHaveBeenCalledWith(
      '100',
      'L:topic.failedCopyMessageSupportInfo:payload',
      expect.any(Object)
    );
  });

  it('syncs edited client message when topic exists', () => {
    const { handlers, Telegram } = setupClientModule();
    Telegram.GetTopicIdByUserId.mockReturnValue({ topic_id: '77' });

    handlers.edited_message?.({
      chat: { id: '42' },
      from: { id: 42, is_bot: false },
      message_id: 13,
    });

    expect(Telegram.syncMessage).toHaveBeenCalledWith(
      expect.objectContaining({ message_id: 13 }),
      '77'
    );
  });

  it('handles END_DIALOG callback and answers query', async () => {
    const { handlers, Telegram } = setupClientModule();

    await handlers.callback_query?.({
      id: 'cb-1',
      data: 'END_DIALOG',
      from: { id: 42, is_bot: false },
      message: {
        chat: { id: '42' },
        message_id: 14,
      },
    });

    expect(Telegram.EndDialog).toHaveBeenCalledWith(
      expect.objectContaining({ message_id: 14 }),
      42
    );
    expect(Telegram.answerCallbackQuery).toHaveBeenCalledWith('cb-1', {
      show_alert: true,
      text: 'dialog-ended',
    });
  });
});
