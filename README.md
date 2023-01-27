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
