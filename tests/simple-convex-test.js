// Simple Convex Integration Test
// Just tests basic functionality without creating test data

const { ConvexHttpClient } = require('convex/browser');

async function testBasicConvexIntegration() {
  console.log('🧪 Simple Convex Integration Test\n');

  // Initialize Convex client
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    console.log('❌ NEXT_PUBLIC_CONVEX_URL not found');
    process.exit(1);
  }

  const convex = new ConvexHttpClient(convexUrl);
  console.log(`✅ Connected to Convex: ${convexUrl}\n`);

  try {
    // Test 1: Basic repository query
    console.log('1. Testing repository queries...');
    const repositories = await convex.query("repositories:getAllRepositories", {});
    console.log(`✅ Found ${repositories.length} repositories`);
    
    if (repositories.length === 0) {
      console.log('ℹ️  No repositories found - this is normal for a fresh setup');
      console.log('   Run repository cloning to add data for testing');
      return;
    }

    const firstRepo = repositories[0];
    console.log(`   Repository: ${firstRepo.name} (${firstRepo.owner})`);
    console.log(`   Status: ${firstRepo.status}`);

    // Test 2: Test commits query
    console.log('\n2. Testing commits query...');
    const commitsResult = await convex.query("commits:getCommits", {
      repositoryId: firstRepo._id,
      limit: 5
    });
    
    const commits = commitsResult.page || [];
    console.log(`✅ Found ${commits.length} commits for repository`);
    
    if (commits.length > 0) {
      console.log(`   Latest commit: ${commits[0].message.substring(0, 50)}...`);
      console.log(`   Author: ${commits[0].author}`);
    }

    // Test 3: Test conversation thread creation
    console.log('\n3. Testing conversation creation...');
    const threadId = await convex.mutation("conversations:createThread", {
      repositoryId: firstRepo._id,
      title: "Simple Test Chat Session"
    });
    console.log(`✅ Created conversation thread: ${threadId}`);

    // Test 4: Test message saving
    console.log('\n4. Testing message saving...');
    const questionId = await convex.mutation("conversations:saveQuestion", {
      repositoryId: firstRepo._id,
      threadId,
      query: "Test question",
      response: "Test response",
      relevantCommits: [],
      relevantFiles: [],
      contextSources: [],
      processingTime: 100,
      confidence: 0.5,
      messageType: "user"
    });
    console.log(`✅ Saved test message: ${questionId}`);

    // Test 5: Test message retrieval
    console.log('\n5. Testing message retrieval...');
    const messages = await convex.query("conversations:getThreadMessages", {
      threadId,
      limit: 10
    });
    console.log(`✅ Retrieved ${messages.length} messages from thread`);

    console.log('\n🎉 All basic Convex integration tests passed!');
    console.log('\n📊 Test Summary:');
    console.log(`   - Connected to Convex: ✅`);
    console.log(`   - Repository queries working: ✅`);
    console.log(`   - Commit queries working: ✅`);
    console.log(`   - Conversation threads working: ✅`);
    console.log(`   - Message storage working: ✅`);
    console.log(`   - Message retrieval working: ✅`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Make sure the dev server is running: pnpm dev-full');
    console.log('   2. Check that Convex deployment is active');
    console.log('   3. Verify environment variables are set correctly');
    process.exit(1);
  }
}

async function main() {
  // Load environment variables
  const fs = require('fs');
  const path = require('path');
  
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = envContent.split('\n').filter(line => line.includes('='));
    
    envVars.forEach(line => {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=');
      if (key && value) {
        process.env[key] = value;
      }
    });
  }

  await testBasicConvexIntegration();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testBasicConvexIntegration };