// Manual Chat Interface Test Script
// Run this after starting the dev server with: node tests/manual-chat-test.js

// Using built-in fetch (Node.js 18+) or global fetch

const TEST_URL = 'http://localhost:3004';
const CHAT_API_URL = `${TEST_URL}/api/ai/context-builder`;

async function testChatAPI() {
  console.log('🧪 Testing Chat API Integration\n');

  try {
    // Test 1: Context Builder API
    console.log('1. Testing Context Builder API...');
    const contextResponse = await fetch(CHAT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repositoryId: 'test-repo-id',
        question: 'What is this repository about?',
        maxCommits: 3,
        maxFiles: 2
      })
    });

    if (contextResponse.ok) {
      const contextData = await contextResponse.json();
      console.log('✅ Context Builder API working');
      console.log(`   - Success: ${contextData.success}`);
      console.log(`   - Context Sources: ${contextData.contextSources?.length || 0}`);
      console.log(`   - Context Quality: ${JSON.stringify(contextData.contextQuality)}`);
    } else {
      console.log('❌ Context Builder API failed');
      console.log(`   - Status: ${contextResponse.status}`);
      console.log(`   - Error: ${await contextResponse.text()}`);
    }

    // Test 2: Check if server is responding
    console.log('\n2. Testing Server Availability...');
    const healthResponse = await fetch(TEST_URL);
    if (healthResponse.ok) {
      console.log('✅ Server is responding');
    } else {
      console.log(`❌ Server not responding: ${healthResponse.status}`);
    }

    // Test 3: Invalid request handling
    console.log('\n3. Testing Error Handling...');
    const errorResponse = await fetch(CHAT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}) // Empty body to trigger error
    });

    if (errorResponse.status === 400) {
      console.log('✅ Error handling working (400 for missing fields)');
    } else {
      console.log(`❌ Unexpected error response: ${errorResponse.status}`);
    }

    console.log('\n🎉 API Tests Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the dev server is running with: pnpm dev-full');
    process.exit(1);
  }
}

async function checkEnvironment() {
  console.log('🔍 Environment Check\n');
  
  // Check if required environment variables are set
  const requiredEnvVars = [
    'NEXT_PUBLIC_CONVEX_URL',
    'CONVEX_DEPLOYMENT'
  ];

  let envOk = true;
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar}: Set`);
    } else {
      console.log(`❌ ${envVar}: Missing`);
      envOk = false;
    }
  }

  if (process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY) {
    console.log(`✅ AI API Key: Set`);
  } else {
    console.log(`⚠️  AI API Key: Missing (Claude functionality may not work)`);
  }

  console.log();
  return envOk;
}

async function main() {
  console.log('🚀 Chat Interface Manual Test Suite\n');
  
  // Load environment variables
  require('dotenv').config({ path: '.env.local' });
  
  const envOk = await checkEnvironment();
  
  if (!envOk) {
    console.log('❌ Environment setup incomplete. Please run: pnpm setup-convex');
    process.exit(1);
  }
  
  await testChatAPI();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testChatAPI, checkEnvironment };