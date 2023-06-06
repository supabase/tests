# tests

Repo with system and integration tests that can be used across different Supabase services to check if everything works together.

## test-reports

- #### supabase-integration local

  - new report (js/ts): <https://supabase.github.io/test-reports/integration-local>

- #### platform-verification

  - stage: <https://supabase.github.io/test-reports/verification-stage>
  - prod: <https://supabase.github.io/test-reports/verification-prod>

## Repo structure

### gh-bugs-project

Script to sync new GitHub issues with GitHub Project. Script is running hourly by cron as GH workflow.

### src

Common actions and scripts. Includes auth related functions, some common fetch enhancements to add retries and timeout. Also Supabase Project related scripts, such as project creation, deletion, pause and restore, apply simple migrations.

### verification

Few tests that check via Supabase platform UI and API routes used by dashboard that platform works correctly.

### integration

Tests that check if supabase-js client library works correctly with Supabase services. Can be run against local setup using docker-compose or supabase-cli, and against production supabase project.

### restore

Additional tests that check if Supabase project works correctly after pause and restore procedure. Preparation steps (to run before pause-restore) should be placed in `preparations` directory, it will be run all together before project is paused. And then after project is restored, tests will run.

This may not be the best practice, but it significantly increases tests speed, because pause and restore action will be run only once.

### frontend

Tests for supabase dashboard. Place for e2e and integration tests.

---

## How to run

To run locally you need to download .env file from bitwarden for environment you are going to use: either `staging` or `prod` and put it in `.env.staging` or `.env.prod` file.

Run `npm install` to install dependencies. And then run `npm install` in each project you want to run tests from.

### integration tests

To run integration tests against staging or prod environment you have to create a project first:

```bash
NODE_ENV=staging npm run project:create
cp .env .env.migrate
npm run project:migrate
cp .env integration/.env.staging
```

```bash
NODE_ENV=prod npm run project:create
cp .env .env.migrate
npm run project:migrate
cp .env integration/.env.prod
```

Then go to the integration tests folder `cd integration` and run `npm run test:stage` or `npm run test:prod`.

#### **Cleanup**

Don't forget to delete project after you've done with it:

```bash
NODE_ENV=prod npm run project:delete
```

```bash
NODE_ENV=staging npm run project:delete
```

### frontend tests

Install dependencies in `/frontend`. And run `npx playwright install --with-deps` to install browsers for playwright. Make sure you pulled .env for staging or prod and run either:

```bash
npm run test:frontend:stage
```

```bash
npm run test:frontend:prod
```

To run tests against vercel preview build just change the following env in `.env.staging`:

```bash
SUPA_DASHBOARD='https://supabase-studio-staging-...-supabase.vercel.app'
```

#### **Additional notes**

- There is one limitation currently: playwright UI can work for about 10 minutes only, cause gotrue token will expire after.

- To clean old browser context folders that conquered your workspace run:

  ```bash
  npm run browserCtx:clean
  ```
