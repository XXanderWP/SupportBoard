const importEnvModule = (existingFiles: string[]) => {
  const config = jest.fn(() => ({ parsed: { SAMPLE: 'value' } }));
  const existsSync = jest.fn((filePath: string) =>
    existingFiles.includes(filePath)
  );
  const resolve = jest.fn((...parts: string[]) => parts.join('/'));
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});

  jest.doMock('fs', () => ({
    __esModule: true,
    default: {
      existsSync,
    },
    existsSync,
  }));

  jest.doMock('path', () => ({
    __esModule: true,
    default: {
      resolve,
    },
    resolve,
  }));

  jest.doMock('dotenv', () => ({
    __esModule: true,
    default: {
      config,
    },
  }));

  let thrown: unknown;
  jest.isolateModules(() => {
    try {
      require('./env');
    } catch (error) {
      thrown = error;
    }
  });

  log.mockRestore();

  return {
    config,
    existsSync,
    resolve,
    thrown,
  };
};

describe('env module', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it.each(['.env', '.env.defaults'])(
    'loads %s when it is the first available env file',
    fileName => {
      const filePath = `${process.cwd()}/${fileName}`;
      const { config, existsSync, resolve, thrown } = importEnvModule([
        filePath,
      ]);

      expect(thrown).toBeUndefined();
      expect(existsSync).toHaveBeenCalledWith(`${process.cwd()}/.env`);
      expect(existsSync).toHaveBeenCalledWith(filePath);
      expect(config).toHaveBeenCalledTimes(1);
      expect(config).toHaveBeenCalledWith({
        path: filePath,
      });
      expect(resolve).toHaveBeenCalledWith(process.cwd(), '.env');
      expect(resolve).toHaveBeenCalledWith(process.cwd(), fileName);
    }
  );

  it('throws when no env file exists', () => {
    const { config, thrown } = importEnvModule([]);

    expect(config).not.toHaveBeenCalled();
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe(
      'No .env file found. Please create one to set environment variables.'
    );
  });
});
