# Testing Strategy

## Overview

Mentorshape uses a focused testing strategy covering integration tests and end-to-end tests. We skip unit testing to avoid over-engineering and focus on testing the system as a whole.

---

## Testing Approach

```
        /\
       /  \     E2E Tests (30%)
      /____\
     /      \   Integration Tests (70%)
    /________\
```

- **Integration Tests**: Test API endpoints, database interactions, external services
- **E2E Tests**: Test complete user flows in browser

**Note:** Unit testing is skipped to keep the testing strategy lean and focused on what matters most - ensuring the system works correctly end-to-end.

---

## Integration Testing

### Framework

- **API Routes**: Vitest + Supertest
- **Database**: Test database (separate from production)
- **External Services**: Mock or test mode (Stripe test mode)

### What to Test

#### API Endpoints

- Request validation
- Authentication/authorization
- Database operations
- Error handling
- Response format

**Example:**
```typescript
import request from 'supertest';
import { app } from '@/app';

test('POST /api/goals creates goal', async () => {
  const response = await request(app)
    .post('/api/goals')
    .set('Authorization', `Bearer ${testToken}`)
    .send({
      title: 'Test Goal',
      category: 'career',
      duration_days: 60
    });
  
  expect(response.status).toBe(200);
  expect(response.body.data).toHaveProperty('id');
  expect(response.body.data.title).toBe('Test Goal');
});

test('POST /api/goals returns 401 without auth', async () => {
  const response = await request(app)
    .post('/api/goals')
    .send({ title: 'Test' });
  
  expect(response.status).toBe(401);
});
```

#### Database Operations

- CRUD operations
- Foreign key constraints
- RLS policies
- Transactions
- Indexes (query performance)

**Example:**
```typescript
import { createClient } from '@/lib/supabase/test-client';

test('RLS prevents accessing other user goals', async () => {
  const user1Client = createTestClient(user1Token);
  const user2Client = createTestClient(user2Token);
  
  const goal = await user1Client.from('goals').insert({
    title: 'User 1 Goal',
    profile_id: user1ProfileId
  }).select().single();
  
  const result = await user2Client
    .from('goals')
    .select()
    .eq('id', goal.id)
    .single();
  
  expect(result.data).toBeNull();
  expect(result.error).toBeTruthy();
});
```

#### Webhook Handlers

- Signature verification
- Event processing
- Idempotency
- Error handling

**Example:**
```typescript
test('Clerk webhook creates user', async () => {
  const webhookPayload = {
    type: 'user.created',
    data: {
      id: 'clerk_user_123',
      email_addresses: [{ email_address: 'test@example.com' }]
    }
  };
  
  const signature = createWebhookSignature(webhookPayload);
  
  const response = await request(app)
    .post('/api/webhook/clerk')
    .set('svix-signature', signature)
    .send(webhookPayload);
  
  expect(response.status).toBe(200);
  
  const user = await supabase
    .from('users')
    .select()
    .eq('clerk_user_id', 'clerk_user_123')
    .single();
  
  expect(user.data).toBeTruthy();
});
```

### Test Database Setup

- Use separate test database (Supabase test project)
- Run migrations before tests
- Seed test data
- Clean up after tests

**Setup:**
```typescript
beforeAll(async () => {
  await runMigrations();
  await seedTestData();
});

afterAll(async () => {
  await cleanupTestData();
});
```

---

## End-to-End Testing

### Framework

- **Playwright**: Browser automation
- **Alternative**: Cypress (if preferred)

### What to Test

#### User Flows

- **Mentee Flow:**
  - Sign up → Create goal → Share goal → Accept collaboration → Book session → Complete goal

- **Mentor Flow:**
  - Become mentor → Set availability → Accept collaboration → Run session → Get badge

- **Payment Flow:**
  - Select plan → Checkout → Payment → Access Pro features

**Example:**
```typescript
import { test, expect } from '@playwright/test';

test('mentee can create and share goal', async ({ page }) => {
  // Sign in
  await page.goto('/sign-in');
  await page.fill('[name="email"]', 'mentee@test.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // Create goal
  await page.goto('/goals/new');
  await page.fill('[name="title"]', 'Become a PM');
  await page.selectOption('[name="category"]', 'career');
  await page.selectOption('[name="duration_days"]', '60');
  await page.click('button:has-text("Create Goal")');
  
  // Verify goal created
  await expect(page.locator('text=Become a PM')).toBeVisible();
  
  // Get share link
  const shareLink = await page.locator('[data-testid="share-link"]').textContent();
  expect(shareLink).toContain('/g/');
});
```

#### Critical Paths

- Authentication (sign up, sign in, sign out)
- Goal creation and sharing
- Collaboration requests
- Session booking
- Payment processing
- Profile management

### Test Data Management

- Use test accounts (not production)
- Seed test data before E2E suite
- Clean up after tests
- Use test Stripe keys

### Browser Coverage

- **Chrome**: Primary browser
- **Firefox**: Secondary browser
- **Safari**: If on macOS
- **Mobile**: Responsive testing (Chrome DevTools)

---

## AI Agent Testing

### Challenges

- LLM responses are non-deterministic
- API costs for testing
- Rate limiting

### Strategies

#### Mock LLM Responses

- Store example responses in test fixtures
- Mock LangChain/OpenAI clients
- Test prompt construction separately

**Example:**
```typescript
const mockGoalShaperResponse = {
  title: 'Transition to Product Management',
  milestones: [
    { title: 'Learn fundamentals', relative_day_offset: 7 }
  ]
};

vi.mock('@/lib/ai/goal-shaper', () => ({
  shapeGoal: vi.fn().mockResolvedValue(mockGoalShaperResponse)
}));
```

#### Test Prompt Construction

- Test that prompts include correct variables
- Test prompt formatting
- Test system prompts

**Example:**
```typescript
test('goal shaper prompt includes all inputs', () => {
  const prompt = buildGoalShaperPrompt({
    goal_text: 'Become a PM',
    duration_days: 60,
    challenges: 'No experience'
  });
  
  expect(prompt).toContain('Become a PM');
  expect(prompt).toContain('60');
  expect(prompt).toContain('No experience');
});
```

#### Test Response Parsing

- Test JSON parsing
- Test schema validation (Zod)
- Test error handling for malformed responses

**Example:**
```typescript
test('parses valid goal shaper response', () => {
  const response = parseGoalShaperResponse(mockResponse);
  expect(response.milestones).toBeArray();
  expect(response.title).toBeString();
});

test('throws error for invalid response', () => {
  expect(() => {
    parseGoalShaperResponse({ invalid: 'data' });
  }).toThrow();
});
```

#### Integration Tests with Test Mode

- Use OpenAI/Anthropic test mode (if available)
- Or use cheaper models for testing
- Limit test runs to avoid costs

---

## Test Data Management

### Fixtures

- Store test data in `__fixtures__/` directory
- JSON files for static data
- Factories for dynamic data

**Example:**
```typescript
// __fixtures__/users.ts
export const testUser = {
  clerk_user_id: 'clerk_test_123',
  email: 'test@example.com'
};

// __fixtures__/factories.ts
export function createTestGoal(overrides = {}) {
  return {
    title: 'Test Goal',
    category: 'career',
    duration_days: 60,
    status: 'draft',
    ...overrides
  };
}
```

### Database Seeding

- Seed script: `scripts/seed-test-db.ts`
- Run before integration/E2E tests
- Include common test scenarios

---

## Test Coverage Goals

- **Integration Tests**: 70%+ coverage (API endpoints, database operations)
- **E2E Tests**: All critical paths covered (user flows, payment flows)

### Coverage Tools

- **Vitest**: Built-in coverage (c8/istanbul)
- **Coverage Reports**: HTML reports in `coverage/`
- **CI Integration**: Fail if coverage drops

---

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:e2e
      - run: npm run test:coverage
```

### Test Scripts

```json
{
  "scripts": {
    "test": "vitest run --dir src/app/api && playwright test",
    "test:integration": "vitest run --dir src/app/api",
    "test:e2e": "playwright test",
    "test:watch": "vitest watch --dir src/app/api"
  }
}
```

---

## Performance Testing

### Load Testing

- **Tool**: k6 or Artillery
- **Scenarios**: 
  - API endpoint load
  - Concurrent users
  - Database query performance

**Example:**
```javascript
import http from 'k6/http';

export default function () {
  http.get('https://api.mentorshape.com/api/goals', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
}
```

### Database Performance

- Test query performance with large datasets
- Verify indexes are used
- Test RLS policy performance

---

## Best Practices

### Do's

- Write tests before fixing bugs (TDD)
- Keep tests independent (no shared state)
- Use descriptive test names
- Mock external dependencies
- Test error cases
- Keep tests fast (< 1s for unit tests)

### Don'ts

- Don't test implementation details
- Don't test third-party libraries
- Don't write flaky tests
- Don't skip error cases
- Don't commit failing tests

---

## Debugging Tests

### Tools

- **Vitest UI**: Visual test runner
- **Playwright Inspector**: Debug E2E tests
- **VS Code Debugger**: Debug unit/integration tests

### Common Issues

- **Flaky tests**: Use `waitFor` instead of `sleep`
- **Timeout errors**: Increase timeout or optimize test
- **Database conflicts**: Use transactions or unique test data
- **Mock not working**: Check import paths and vi.mock placement

---

## Future Enhancements

- Visual regression testing (Percy, Chromatic)
- Accessibility testing (axe-core)
- Security testing (OWASP ZAP)
- Contract testing (Pact)
- Mutation testing (Stryker)

