#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Function to load environment variables from .env or .dev.vars files
function loadEnvVars() {
  const envFiles = ['.env', '.dev.vars'];
  let npmToken = process.env.NPM_TOKEN;

  // If NPM_TOKEN is not in environment variables, try to load from files
  if (!npmToken) {
    for (const file of envFiles) {
      const filePath = path.join(rootDir, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const match = content.match(/npm_publish_token=(.*)/);
        if (match && match[1]) {
          npmToken = match[1].trim();
          break;
        }
      }
    }
  }

  return { npmToken };
}

// Main function
async function publishWithToken() {
  const { npmToken } = loadEnvVars();

  if (!npmToken) {
    console.error('Error: NPM_TOKEN not found in environment or .env/.dev.vars files');
    process.exit(1);
  }

  // Get the backup of any existing .npmrc file
  const npmrcPath = path.join(rootDir, '.npmrc');
  let npmrcBackup = null;

  if (fs.existsSync(npmrcPath)) {
    npmrcBackup = fs.readFileSync(npmrcPath, 'utf8');
  }

  try {
    // Create temporary .npmrc file from template
    const templatePath = path.join(rootDir, '.npmrc.publish.template');
    let npmrcContent = fs.readFileSync(templatePath, 'utf8');
    npmrcContent = npmrcContent.replace('${NPM_TOKEN}', npmToken);
    fs.writeFileSync(npmrcPath, npmrcContent);

    // // Execute build to ensure everything is up to date
    // console.log('Building package...');
    // try {
    //   execSync('npm run build', { stdio: 'inherit' });
    // } catch (error) {
    //   console.log('No build script found, skipping build step');
    // }

    // Publish the package
    console.log('Publishing @formdata/cloudflare-firebase...');
    try {
      execSync('npm publish --ignore-scripts', { stdio: 'inherit' });
      console.log('Successfully published @formdata/cloudflare-firebase');
    } catch (error) {
      console.error('Failed to publish package:', error.message);
      throw error;
    }
  } finally {
    // Restore original .npmrc or remove it if it didn't exist
    if (npmrcBackup) {
      fs.writeFileSync(npmrcPath, npmrcBackup);
    } else {
      fs.unlinkSync(npmrcPath);
    }
  }
}

// Run the script
publishWithToken().catch(error => {
  console.error('Publish failed:', error);
  process.exit(1);
});
