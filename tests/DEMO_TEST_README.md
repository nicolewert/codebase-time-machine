# Critical Demo Flow Test

A comprehensive end-to-end test that validates the complete hackathon demo user flow.

## What It Tests

### Complete User Journey
1. **Homepage Navigation** - Verify core UI elements and navigation links
2. **Repository Addition** - Test URL validation and form submission with real GitHub repo
3. **Git Processing** - Verify repository cloning and status tracking
4. **Dashboard Visualization** - Check data display and navigation
5. **AI Q&A Functionality** - Test Claude AI integration and chat interface
6. **Error Handling** - Validate graceful error recovery and edge cases

### Test Scenarios
- ✅ Repository addition with `https://github.com/vercel/micro` (small, stable repo)
- ✅ Real-time status updates during cloning/processing
- ✅ Dashboard navigation and visualization
- ✅ AI chat interface interaction
- ✅ Duplicate repository handling
- ✅ Invalid repository URL handling
- ✅ Performance under demo conditions

## Quick Start

### Option 1: Full Automated Test (Recommended for Demo Prep)
```bash
# Starts server, runs tests, cleans up automatically
pnpm test-demo-full
```

### Option 2: Manual Test Execution
```bash
# Start server (if not running)
pnpm dev-full

# Run test against running server (in another terminal)
pnpm test-demo-headless

# Or with UI for debugging
pnpm test-demo
```

### Option 3: Direct Playwright Execution
```bash
npx playwright test tests/integration/critical-demo-flow.test.js
```

## Test Configuration

- **Repository**: `vercel/micro` (small, stable, publicly available)
- **Timeout**: 5 minutes total test execution
- **Demo Readiness**: 60 seconds for UI interactions
- **AI Analysis**: 2 minutes for Claude API responses

## What Success Looks Like

✅ **Homepage loads with all navigation links**  
✅ **Repository form accepts and validates GitHub URLs**  
✅ **Repository appears in dashboard with status tracking**  
✅ **Dashboard visualization loads repository data**  
✅ **AI chat interface accepts questions**  
✅ **Error scenarios handled gracefully**

## Troubleshooting

### Common Issues

**Server Won't Start**
```bash
# Kill any processes on port 3000
lsof -ti:3000 | xargs kill -9
pnpm setup-convex  # Ensure Convex is configured
```

**Test Timeouts**
- Check your internet connection (test uses real GitHub repo)
- Ensure Claude API key is set for AI testing
- Verify Convex deployment is active

**Repository Already Exists Error**
- Normal behavior - test verifies duplicate handling
- Clear Convex data if needed for fresh testing

### Debug Mode
```bash
# Run with Playwright UI for step-by-step debugging
npx playwright test tests/integration/critical-demo-flow.test.js --ui
```

### Screenshots
Failed tests automatically capture screenshots to `test-results/`

## Demo Readiness Checklist

Before your hackathon demo:

1. **Run the test**: `pnpm test-demo-full`
2. **Verify all phases pass**: Repository addition → Processing → Dashboard → AI Q&A
3. **Check performance**: Test completes within 5 minutes
4. **Test error recovery**: Invalid URLs are handled gracefully
5. **Confirm AI responses**: Claude API integration works

## Integration Points

This test validates integration between:
- **Frontend**: Next.js React components and routing
- **Backend**: Convex database and real-time subscriptions  
- **External APIs**: GitHub API for repository validation
- **AI Services**: Claude API for code analysis and Q&A
- **Git Operations**: Repository cloning and parsing pipeline

## Files Involved

- `critical-demo-flow.test.js` - Main test file
- `run-demo-test.js` - Automated test runner with server lifecycle
- `package.json` - Test scripts and dependencies

Perfect for validating your hackathon demo works end-to-end before presenting!