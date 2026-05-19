describe('system module', () => {
  const originalRemoveSystemMessages = process.env.REMOVE_SYSTEM_MESSAGES;

  afterEach(() => {
    process.env.REMOVE_SYSTEM_MESSAGES = originalRemoveSystemMessages;
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('does not register message handler when REMOVE_SYSTEM_MESSAGES is not true', () => {
    process.env.REMOVE_SYSTEM_MESSAGES = 'false';
    const handleMessage = jest.fn();

    jest.doMock('./telegram', () => ({
      Telegram: {
        HandleMessage: handleMessage,
        deleteMessage: jest.fn(),
        data: { groupId: '100' },
      },
    }));

    jest.isolateModules(() => {
      require('./system');
    });

    expect(handleMessage).not.toHaveBeenCalled();
  });

  it('registers handler and deletes only forum edited messages in support group', async () => {
    process.env.REMOVE_SYSTEM_MESSAGES = 'true';
    const deleteMessage = jest.fn();
    let registeredHandler:
      | ((message: {
          chat: { id: string | number };
          forum_topic_edited?: object;
          message_id: number;
        }) => Promise<void>)
      | undefined;

    jest.doMock('./telegram', () => ({
      Telegram: {
        HandleMessage: jest.fn(
          (handler: (message: any) => Promise<void>) =>
            (registeredHandler = handler)
        ),
        deleteMessage,
        data: { groupId: '100' },
      },
    }));

    jest.isolateModules(() => {
      require('./system');
    });

    expect(registeredHandler).toBeDefined();

    await registeredHandler!({
      chat: { id: '999' },
      forum_topic_edited: {},
      message_id: 10,
    });
    expect(deleteMessage).not.toHaveBeenCalled();

    await registeredHandler!({
      chat: { id: '100' },
      message_id: 11,
    });
    expect(deleteMessage).not.toHaveBeenCalled();

    await registeredHandler!({
      chat: { id: '100' },
      forum_topic_edited: {},
      message_id: 12,
    });
    expect(deleteMessage).toHaveBeenCalledWith('100', 12);
  });
});
