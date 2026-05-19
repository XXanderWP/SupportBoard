const importEnvModule = (existingFiles: string[]) => {
  const config = jest.fn();
  const existsSync = jest.fn((filePath: string) => existingFiles.includes(filePath));
  const resolve = jest.fn((...parts: string[]) => parts.join('/'));

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

  it('loads the first existing env file in priority order', () => {
    const { config, existsSync, resolve, thrown } = importEnvModule([
      `${process.cwd()}/.env.local`,
    ]);

    expect(thrown).toBeUndefined();
    expect(existsSync).toHaveBeenCalledWith(`${process.cwd()}/.env`);
    expect(existsSync).toHaveBeenCalledWith(`${process.cwd()}/.env.local`);
    expect(config).toHaveBeenCalledTimes(1);
    expect(config).toHaveBeenCalledWith({
      path: `${process.cwd()}/.env.local`,
    });
    expect(resolve).toHaveBeenCalledWith(process.cwd(), '.env');
    expect(resolve).toHaveBeenCalledWith(process.cwd(), '.env.local');
  });

  it('throws when no env file exists', () => {
    const { config, thrown } = importEnvModule([]);

    expect(config).not.toHaveBeenCalled();
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe(
      'No .env file found. Please create one to set environment variables.'
    );
  });
});
