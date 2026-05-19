import { TopicStatus } from '../../shared/topic';
import { StorageDefault } from '../../shared/storage';

type StorageShape = typeof StorageDefault;

const setupTelegramModule = (initial?: Partial<StorageShape>) => {
  let storageData: StorageShape = {
    topics: [],
    removeTopics: [],
    ...initial,
  };

  const botMethods = {
    on: jest.fn(),
    getMe: jest.fn(async () => ({ id: 1, username: 'bot' })),
    getChatMember: jest.fn(async () => ({ status: 'administrator' })),
    getChat: jest.fn(async () => ({
      is_forum: true,
      id: '42',
      username: 'user',
    })),
    createForumTopic: jest.fn(),
    sendMessage: jest.fn(async () => ({ message_id: 100 })),
    pinChatMessage: jest.fn(async () => true),
    deleteForumTopic: jest.fn(async () => true),
    editForumTopic: jest.fn(async () => true),
    editMessageText: jest.fn(async () => true),
    editMessageCaption: jest.fn(async () => true),
  };

  const storageMock = {
    OnLoad: jest.fn(),
    Get: jest.fn((key: keyof StorageShape) => storageData[key]),
    UpdateData: jest.fn((newData: Partial<StorageShape>) => {
      storageData = {
        ...storageData,
        ...newData,
      } as StorageShape;
    }),
  };

  jest.doMock('node-telegram-bot-api', () => {
    class MockTelegramBot {
      constructor(_token: string, _options: { polling: boolean }) {}
      on = (...args: [string, ...any[]]) => botMethods.on(...args);
      getMe = (...args: []) => botMethods.getMe(...args);
      getChatMember = (...args: []) => botMethods.getChatMember(...args);
      getChat = (...args: []) => botMethods.getChat(...args);
      createForumTopic = (...args: []) => botMethods.createForumTopic(...args);
      sendMessage = (...args: []) => botMethods.sendMessage(...args);
      pinChatMessage = (...args: []) => botMethods.pinChatMessage(...args);
      deleteForumTopic = (...args: []) => botMethods.deleteForumTopic(...args);
      editForumTopic = (...args: []) => botMethods.editForumTopic(...args);
      editMessageText = (...args: []) => botMethods.editMessageText(...args);
      editMessageCaption = (...args: []) =>
        botMethods.editMessageCaption(...args);
    }

    return {
      __esModule: true,
      default: MockTelegramBot,
    };
  });

  jest.doMock('./data', () => ({
    GetTelegramData: () => ({ groupId: '100', token: 'token' }),
  }));

  jest.doMock('./storage', () => ({
    Storage: storageMock,
  }));

  jest.doMock('./lang', () => ({
    LangString: (key: string, ...args: unknown[]) =>
      `L:${key}:${args.join('|')}`,
    LangStringMsg: (_msg: unknown, key: string) => `LM:${key}`,
  }));

  jest.doMock('./keycontrol', () => ({
    GenerateInlineKeyboard: (forClient: boolean) => [
      [{ text: forClient ? 'client' : 'admin', callback_data: 'CB' }],
    ],
  }));

  jest.doMock('@xxanderwp/jstoolkit', () => ({
    sleep: async () => undefined,
    time: {
      timestamp: () => 123456,
    },
  }));

  let Telegram: any;
  jest.isolateModules(() => {
    Telegram = require('./telegram').Telegram;
  });

  return {
    Telegram,
    botMethods,
    storageMock,
    getStorage: () => storageData,
  };
};

describe('telegram module', () => {
  const originalKeep = process.env.KEEP_CLOSED_TOPICS;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    process.env.KEEP_CLOSED_TOPICS = originalKeep;
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('returns group info with inGroup and topic enabled', async () => {
    const { Telegram } = setupTelegramModule();

    const info = await Telegram.getGroupInfo({ id: 1 } as any);

    expect(info).toEqual({ inGroup: true, topic: true });
  });

  it('returns fallback group info on API error', async () => {
    const { Telegram, botMethods } = setupTelegramModule();
    botMethods.getChatMember.mockRejectedValue(new Error('no access'));

    const info = await Telegram.getGroupInfo({ id: 1 } as any);

    expect(info).toEqual({ inGroup: false, topic: false });
  });

  it('finds topic by user id', () => {
    const { Telegram } = setupTelegramModule({
      topics: [
        {
          user_id: '42',
          topic_id: '77',
          answered: false,
          last_message_time: 1,
          message_pairs: [],
        },
      ],
    });

    expect(Telegram.GetTopicIdByUserId('42')?.topic_id).toBe('77');
    expect(Telegram.GetTopicIdByUserId('404')).toBeUndefined();
  });

  it('assigns topic and updates topic info', () => {
    const { Telegram } = setupTelegramModule({
      topics: [
        {
          user_id: '42',
          topic_id: '77',
          answered: false,
          last_message_time: 1,
          message_pairs: [],
        },
      ],
    });

    const updateSpy = jest
      .spyOn(Telegram, 'UpdateTopicInfo')
      .mockResolvedValue(undefined);

    const result = Telegram.AssignTopic({ message_thread_id: 77 } as any, 500);

    expect(result).toContain('topic.key.assign.done');
    expect(updateSpy).toHaveBeenCalledTimes(1);
  });

  it('returns already-assigned text for same admin', () => {
    const { Telegram } = setupTelegramModule({
      topics: [
        {
          user_id: '42',
          topic_id: '77',
          assigned_to: '500',
          answered: false,
          last_message_time: 1,
          message_pairs: [],
        },
      ],
    });

    const result = Telegram.AssignTopic({ message_thread_id: 77 } as any, 500);

    expect(result).toContain('topic.key.assign.already');
  });

  it('ends dialog and deletes forum topic when closed topics are disabled', () => {
    process.env.KEEP_CLOSED_TOPICS = 'false';
    const { Telegram, storageMock, botMethods, getStorage } =
      setupTelegramModule({
        topics: [
          {
            user_id: '42',
            topic_id: '77',
            answered: false,
            last_message_time: 1,
            message_pairs: [],
          },
        ],
        removeTopics: ['10'],
      });

    const result = Telegram.EndDialog({ chat: { id: '42' } } as any, 500);

    expect(result).toContain('topic.message.admin.endDialog');
    expect(botMethods.deleteForumTopic).toHaveBeenCalledWith('100', 77);
    expect(storageMock.UpdateData).toHaveBeenCalledWith(
      {
        topics: [],
        removeTopics: ['10'],
      },
      true
    );
    expect(getStorage().topics).toHaveLength(0);
  });

  it('keeps closed topic id in removeTopics when configured', () => {
    process.env.KEEP_CLOSED_TOPICS = 'true';
    const { Telegram, storageMock, botMethods } = setupTelegramModule({
      topics: [
        {
          user_id: '42',
          topic_id: '77',
          answered: false,
          last_message_time: 1,
          message_pairs: [],
        },
      ],
      removeTopics: ['10'],
    });

    Telegram.EndDialog({ chat: { id: '42' } } as any, 500);

    expect(botMethods.deleteForumTopic).not.toHaveBeenCalled();
    expect(storageMock.UpdateData).toHaveBeenCalledWith(
      {
        topics: expect.any(Array),
        removeTopics: ['10', '77'],
      },
      true
    );
  });

  it('chooses correct icon for topic state', () => {
    const { Telegram } = setupTelegramModule();

    expect(Telegram.GetTopicIcon({ blocked_by: '1' } as any)).toBe(
      TopicStatus.Blocked
    );
    expect(Telegram.GetTopicIcon({ answered: true } as any)).toBe(
      TopicStatus.Done
    );
    expect(Telegram.GetTopicIcon({ deleted: true } as any)).toBe(
      TopicStatus.Closed
    );
    expect(Telegram.GetTopicIcon({ writing_admin: true } as any)).toBe(
      TopicStatus.Writing
    );
    expect(Telegram.GetTopicIcon({} as any)).toBe(TopicStatus.Waiting);
  });

  it('syncs text message to mapped target message', async () => {
    const { Telegram, botMethods } = setupTelegramModule({
      topics: [
        {
          user_id: '42',
          topic_id: '77',
          answered: false,
          last_message_time: 1,
          message_pairs: [['15', '90']],
        },
      ],
    });

    await Telegram.syncMessage(
      {
        chat: { id: '42' },
        message_id: 15,
        text: 'updated',
        entities: [],
      } as any,
      '77'
    );

    expect(botMethods.editMessageText).toHaveBeenCalledWith(
      'updated',
      expect.objectContaining({
        chat_id: '100',
        message_id: 90,
      })
    );
  });

  it('syncs caption message to mapped target message', async () => {
    const { Telegram, botMethods } = setupTelegramModule({
      topics: [
        {
          user_id: '42',
          topic_id: '77',
          answered: false,
          last_message_time: 1,
          message_pairs: [['16', '91']],
        },
      ],
    });

    await Telegram.syncMessage(
      {
        chat: { id: '100' },
        message_id: 16,
        caption: 'new caption',
        caption_entities: [],
      } as any,
      '77'
    );

    expect(botMethods.editMessageCaption).toHaveBeenCalledWith(
      'new caption',
      expect.objectContaining({
        chat_id: '42',
        message_id: 91,
      })
    );
  });
});
