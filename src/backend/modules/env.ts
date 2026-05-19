import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const envFiles = ['.env', '.env.defaults'];

let envLoaded = false;

for (const file of envFiles) {
  const filePath = path.resolve(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    const config = dotenv.config({ path: filePath });
    console.log(
      `Loaded environment variables ${JSON.stringify(config.parsed)}`
    );
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  throw new Error(
    'No .env file found. Please create one to set environment variables.'
  );
} else {
  console.log('Environment variables loaded successfully.');
}
