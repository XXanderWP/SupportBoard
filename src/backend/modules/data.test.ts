import fs from 'fs';
import { GetTelegramData } from './data';

jest.mock('fs');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('GetTelegramData', () => {
  const originalEnv = {
    TELEGRAM_GROUP_ID: process.env.TELEGRAM_GROUP_ID,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  };

  afterEach(() => {
    jest.resetAllMocks();
    process.env.TELEGRAM_GROUP_ID = originalEnv.TELEGRAM_GROUP_ID;
    process.env.TELEGRAM_BOT_TOKEN = originalEnv.TELEGRAM_BOT_TOKEN;
  });

  it('reads group id and token from files when present', () => {
    mockFs.readFileSync
      .mockReturnValueOnce(' 12345 ' as any)
      .mockReturnValueOnce(' token-value ' as any);

    const result = GetTelegramData();

    expect(result).toEqual({ groupId: '12345', token: 'token-value' });
    expect(mockFs.readFileSync).toHaveBeenCalledWith('.group', 'utf-8');
    expect(mockFs.readFileSync).toHaveBeenCalledWith('.secret', 'utf-8');
  });

  it('falls back to environment variables if files are empty', () => {
    process.env.TELEGRAM_GROUP_ID = 'env-group';
    process.env.TELEGRAM_BOT_TOKEN = 'env-token';

    mockFs.readFileSync
      .mockReturnValueOnce('' as any)
      .mockReturnValueOnce('' as any);

    const result = GetTelegramData();

    expect(result).toEqual({ groupId: 'env-group', token: 'env-token' });
  });

  it('throws when group id and token are missing', () => {
    process.env.TELEGRAM_GROUP_ID = '';
    process.env.TELEGRAM_BOT_TOKEN = '';

    mockFs.readFileSync
      .mockReturnValueOnce('' as any)
      .mockReturnValueOnce('' as any);

    expect(() => GetTelegramData()).toThrow(
      'Telegram group ID or bot token is missing.'
    );
  });
});
