# Tests

These tests are made to verify deployments to staging and production.
Small test suites for smoke testing basic functionality.

## Build with

- jest - test-runner
- allure - test-reporting
- testdeck - test organization
- playwright - gui testing and auth flow

## Steps

- run `cp .env.prod.example .env.prod` or `cp .env.staging.example .env.staging`

You will need to provide your GitHub credentials to run tests locally against corresponding
environment either in `.env.prod` or `.env.staging`

```bash
GITHUB_TOTP=KKN**********K6U
GITHUB_USER={your_user_name}
GITHUB_PASS=your_secret_password
```

And pass few envs with info about one of your existing projects in your supabase account for API tests

```bash
PROJECT_REF=your_supabase_project_ref
PROJECT_NAME=your_supabase_project_name
PROJECT_DB_PASS=your_supabase_project_pass
```

- after your env are all set up just run the tests
- `npm run test:staging` to run against staging
- `npm run test:prod` to run against prod

## To see test run reports

- `npm run test:report`
