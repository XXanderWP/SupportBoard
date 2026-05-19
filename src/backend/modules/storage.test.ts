import fs from 'fs';
import os from 'os';
import path from 'path';
import { StorageDefault } from '../../shared/storage';

const importStorageWithCwd = (
  cwd: string
): {
  Storage: {
    Get: <T extends keyof typeof StorageDefault>(
      key: T
    ) => (typeof StorageDefault)[T];
    UpdateData: (
      newData: Partial<typeof StorageDefault>,
      save?: boolean
    ) => void;
    Save: () => void;
    OnLoad: (callback: () => void) => void;
  };
} => {
  const originalCwd = process.cwd();
  let mod: any;

  process.chdir(cwd);
  jest.isolateModules(() => {
    mod = require('./storage');
  });
  process.chdir(originalCwd);

  return mod;
};

describe('Storage module', () => {
  it('loads default structure when .storage is missing', () => {
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'supportboard-storage-')
    );

    const { Storage } = importStorageWithCwd(tmpDir);

    expect(Storage.Get('topics')).toEqual(StorageDefault.topics);
    expect(Storage.Get('removeTopics')).toEqual(StorageDefault.removeTopics);
  });

  it('loads data from existing .storage file', () => {
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'supportboard-storage-')
    );
    const initial = {
      topics: [
        {
          user_id: '1',
          topic_id: '42',
          answered: false,
          last_message_time: 1,
          message_pairs: [],
        },
      ],
      removeTopics: ['42'],
    };

    fs.writeFileSync(
      path.join(tmpDir, '.storage'),
      JSON.stringify(initial),
      'utf-8'
    );

    const { Storage } = importStorageWithCwd(tmpDir);

    expect(Storage.Get('topics')).toHaveLength(1);
    expect(Storage.Get('removeTopics')).toEqual(['42']);
  });

  it('updates in-memory data and saves when requested', () => {
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'supportboard-storage-')
    );
    const originalCwd = process.cwd();

    const { Storage } = importStorageWithCwd(tmpDir);

    process.chdir(tmpDir);
    Storage.UpdateData({ removeTopics: ['abc'] }, false);
    Storage.Save();
    process.chdir(originalCwd);

    const savedRaw = fs.readFileSync(path.join(tmpDir, '.storage'), 'utf-8');
    const savedData = JSON.parse(savedRaw);

    expect(savedData.removeTopics).toEqual(['abc']);
  });

  it('runs OnLoad callback immediately after initialization', () => {
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'supportboard-storage-')
    );
    const { Storage } = importStorageWithCwd(tmpDir);
    const callback = jest.fn();

    Storage.OnLoad(callback);

    expect(callback).toHaveBeenCalledTimes(1);
  });
});
