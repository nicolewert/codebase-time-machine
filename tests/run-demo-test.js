#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting Critical Demo Flow Test');
console.log('=====================================');

const rootDir = path.join(__dirname, '..');
process.chdir(rootDir);

// Configuration
const SERVER_PORT = 3000;
const STARTUP_TIMEOUT = 60000; // 60 seconds
const TEST_TIMEOUT = 300000; // 5 minutes

let serverProcess = null;

// Utility functions
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function killProcessOnPort(port) {
  return new Promise((resolve) => {
    exec(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, (error) => {
      // Ignore errors - port might not be in use
      resolve();
    });
  });
}

async function waitForServer(url, timeout = STARTUP_TIMEOUT) {
  const startTime = Date.now();
  console.log(`⏳ Waiting for server at ${url}`);
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log('✅ Server is ready');
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }
    await sleep(1000);
  }
  
  throw new Error(`Server failed to start within ${timeout}ms`);
}

async function startServer() {
  console.log('🔧 Starting development server...');
  
  // Kill any existing processes on port 3000
  await killProcessOnPort(SERVER_PORT);
  await sleep(2000);
  
  // Start server in background
  serverProcess = spawn('pnpm', ['dev-full'], {
    cwd: rootDir,
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: false
  });
  
  // Log server output for debugging
  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('ready') || output.includes('Local:') || output.includes('3000')) {
      console.log('📡 Server:', output.trim());
    }
  });
  
  serverProcess.stderr.on('data', (data) => {
    const output = data.toString();
    if (!output.includes('warn') && !output.includes('deprecated')) {
      console.log('⚠️  Server Error:', output.trim());
    }
  });
  
  // Wait for server to be ready
  await waitForServer(`http://localhost:${SERVER_PORT}`);
}

function runPlaywrightTest() {
  return new Promise((resolve, reject) => {
    console.log('🎭 Running Playwright tests...');
    
    const testProcess = spawn('npx', [
      'playwright', 
      'test', 
      'tests/integration/critical-demo-flow.test.js',
      '--reporter=line'
    ], {
      cwd: rootDir,
      stdio: 'inherit'
    });
    
    const timeout = setTimeout(() => {
      testProcess.kill();
      reject(new Error('Test timeout exceeded'));
    }, TEST_TIMEOUT);
    
    testProcess.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        console.log('✅ All tests passed!');
        resolve();
      } else {
        reject(new Error(`Tests failed with exit code ${code}`));
      }
    });
    
    testProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function cleanup() {
  console.log('🧹 Cleaning up...');
  
  if (serverProcess) {
    console.log('🛑 Stopping server...');
    
    // Try graceful shutdown first
    serverProcess.kill('SIGTERM');
    
    setTimeout(() => {
      if (serverProcess && !serverProcess.killed) {
        console.log('🔥 Force killing server...');
        serverProcess.kill('SIGKILL');
      }
    }, 5000);
  }
  
  // Kill any remaining processes on port 3000
  exec(`lsof -ti:${SERVER_PORT} | xargs kill -9 2>/dev/null`, () => {
    console.log('✨ Cleanup complete');
  });
}

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

async function main() {
  try {
    // Check if Playwright is installed
    if (!fs.existsSync(path.join(rootDir, 'node_modules', '@playwright', 'test'))) {
      console.log('📥 Installing Playwright...');
      await new Promise((resolve, reject) => {
        const installProcess = spawn('npx', ['playwright', 'install'], {
          cwd: rootDir,
          stdio: 'inherit'
        });
        installProcess.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error('Failed to install Playwright'));
        });
      });
    }
    
    // Start server
    await startServer();
    
    // Run tests
    await runPlaywrightTest();
    
    console.log('🎉 Demo test completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Demo test failed:', error.message);
    
    if (error.message.includes('timeout') || error.message.includes('server')) {
      console.log('\n💡 Troubleshooting tips:');
      console.log('- Ensure you have run `pnpm setup-convex` first');
      console.log('- Check that ports 3000 and Convex port are available');
      console.log('- Verify your .env.local file contains NEXT_PUBLIC_CONVEX_URL');
    }
    
    process.exit(1);
  } finally {
    cleanup();
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };