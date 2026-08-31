You are working on this project codebase.

Before making any changes, your first job is to understand the existing system and architecture, with particular attention to **how application requests interact with data and the database**.

**Do not modify, refactor, create, or delete any code during this onboarding.**

Thoroughly inspect the repository and trace how the application actually works.

Do not assume behavior from filenames, comments, schema definitions, or conventional framework patterns. Verify behavior in the implementation.

## Focus on

* Overall application architecture and major components.
* Frontend → backend → database request flows.
* Database technology, ORM/query layer, and schema organization.
* Database models and important relationships.
* How API routes, server actions, services, workers, and other components access the database.
* Shared database/query abstractions.
* Common read/write patterns.
* How lists, searches, filters, lookups, pagination, joins/relations, and record retrieval are implemented.
* How queries select and return database fields.
* Background jobs and automated processes that interact with the database.
* High-frequency or potentially data-intensive application flows where identifiable from code.
* Authentication/authorization checks that involve database access.
* External integrations that read or write application data.
* Database migrations and how schema changes are managed.
* Existing database indexes, constraints, and related schema configuration.
* Existing performance monitoring, logging, telemetry, tracing, or database observability.
* Deployment/runtime/database configuration where it affects data access or performance.

Trace several important flows end-to-end, for example:

**User → Frontend → API/Server Action → Authentication/Authorization → Database Query → Response**

and where applicable:

**Background Job / Integration → Application Service → Database → External Service**

The goal is to build an accurate mental model of:

1. where database queries originate;
2. how they are constructed;
3. what abstractions are used;
4. which application features generate important database activity;
5. what database performance/observability mechanisms already exist.

Do **not** perform a database optimization audit yet.

Do not assume anything is inefficient simply because you see a particular ORM method or query pattern.

This phase is architecture discovery only.

## Important rules

* Do not change code.
* Do not create migrations.
* Do not add indexes.
* Do not optimize queries.
* Do not install packages.
* Do not create commits.
* Do not recommend fixes yet.
* Do not make assumptions—verify behavior in actual code.
* Do not give me a huge file-by-file explanation.
* Cite important file paths, functions, models, or configuration when they support your conclusions.
* Distinguish confirmed behavior from anything you cannot verify.
* If runtime behavior cannot be determined from the repository, explicitly say so.
* Keep your response short, precise, and easy to scan.

## After reviewing the codebase, give me a concise overview containing:

### 1. Architecture

How the application's major components connect.

### 2. Database Architecture

Database engine, ORM/data layer, schema organization, and migration strategy.

### 3. Query/Data Flow

Where important database operations originate and how requests reach the database.

### 4. Important Data Paths

Major features that perform meaningful database reads/writes, including lists, searches, lookups, filtering, and background operations.

### 5. Existing Database Controls

Indexes, constraints, query abstractions, pagination patterns, caching if relevant, and other existing mechanisms.

### 6. Observability

What database/query logging, performance monitoring, tracing, or production visibility currently exists.

### 7. Important Observations

Anything about the architecture I should know before asking you to perform a focused database investigation.

Keep this first response concise.

**Do not start optimizing anything. I will provide the focused investigation separately.**
