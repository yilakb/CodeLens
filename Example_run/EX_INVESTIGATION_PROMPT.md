Now perform a focused investigation of the database/query architecture you just reviewed.

**Do not modify any code.**

Treat the engineering recommendation below as a **hypothesis to test against the actual codebase**, not an instruction to implement.

## Engineering recommendation being evaluated

An engineer raised three potential database-performance issues:

### 1. Missing or inadequate indexes

Application queries may filter or look up records using columns that do not have appropriate indexes.

At larger data volumes this can cause expensive sequential/full-table scans and increased database resource usage.

The recommendation is to identify important application queries, determine which columns are used in filtering/lookups/joins, evaluate the existing indexes, and determine whether additional indexes are justified.

Do NOT assume every filtered column should be indexed.

### 2. Queries retrieving unnecessary fields

Some database queries may retrieve every field/column of a record even when the requesting API, page, service, or job uses only a subset.

The recommendation is to determine whether important/high-frequency queries retrieve materially more data than their consumers actually use.

### 3. Lack of slow-query visibility

The application may lack sufficient visibility into expensive database queries.

The recommendation is to determine whether the existing system can identify:

* slow queries;
* execution time;
* query frequency;
* expensive database operations;
* resource impact where supported.

The engineer suggests slow-query logging with a threshold and some form of dashboard/monitoring.

Do NOT assume that a custom dashboard is necessary if existing infrastructure already provides equivalent or better visibility.

---

# Investigation

Audit the actual repository and determine whether these problems exist.

## A. Query Inventory

Identify the **important query patterns**, not necessarily every trivial database call.

Prioritize:

* frequently executed application paths;
* user-facing list/search/filter endpoints;
* record lookups;
* relation-heavy queries;
* background jobs;
* authentication/session-related high-frequency queries;
* dashboard/data-loading operations;
* integrations that perform repeated queries;
* queries that may operate on growing tables.

For each significant query pattern, identify:

* where it originates;
* model/table involved;
* filters/lookups;
* ordering;
* joins/relations;
* selected fields;
* expected frequency where it can reasonably be inferred.

Do not produce an enormous raw query dump.

Group similar query patterns.

---

# B. Index Investigation

Compare the important query patterns against the actual database schema and migrations.

Determine:

* what indexes already exist;
* primary/unique indexes that already satisfy query patterns;
* composite indexes;
* indexes created implicitly by the database/ORM where applicable;
* commonly filtered columns;
* commonly joined/related columns;
* commonly sorted columns where relevant;
* query patterns that appear unsupported by useful indexes.

Do NOT conclude that an index is missing solely because a column appears in a `where` clause.

Consider:

* table size;
* query frequency;
* selectivity/cardinality;
* existing composite indexes;
* database query-planner behavior;
* write overhead;
* storage overhead;
* whether the query is actually performance-sensitive.

Where repository evidence alone is insufficient, label the finding **Needs Runtime Verification**.

If possible within the existing development environment and without changing application code, identify how `EXPLAIN` / `EXPLAIN ANALYZE` or equivalent could validate important findings.

Do not fabricate execution plans.

---

# C. Selected-Field Investigation

Inspect important database queries and trace their results to the actual consumer.

Determine whether queries retrieve substantially more data than:

* the API response uses;
* the page renders;
* the service consumes;
* the background job requires.

Distinguish between:

**Confirmed unnecessary data retrieval**

and

**Theoretical optimization with insignificant practical value.**

Pay particular attention to:

* large text/JSON fields;
* blobs or large metadata structures;
* large related records;
* repeated list endpoints;
* high-frequency queries.

Do not recommend changing every query to explicit field selection just for stylistic consistency.

Focus on cases with plausible performance value.

---

# D. Query Observability

Determine what visibility already exists for database performance.

Inspect:

* application logging;
* ORM query logging;
* tracing/APM;
* hosting/database-provider monitoring;
* metrics;
* error monitoring;
* production diagnostics;
* slow-query configuration;
* existing dashboards.

Determine whether operators can currently answer:

1. Which database operations are slow?
2. How frequently are they occurring?
3. Which application operation generated them?
4. How long are they taking?
5. Are they consuming meaningful resources?

Determine whether the engineer's proposed slow-query logging/dashboard adds value or duplicates infrastructure that already exists.

---

# E. Validate the Engineer's Claims

For each of the three recommendations, return one of:

* **CONFIRMED**
* **PARTIALLY APPLICABLE**
* **NOT APPLICABLE**
* **NEEDS RUNTIME VERIFICATION**

Specifically answer:

### Indexing

Do important query paths appear to lack appropriate indexing?

### Field Selection

Are important queries retrieving materially unnecessary data?

### Observability

Does the system lack adequate slow-query/performance visibility?

---

# F. Practical Impact

For confirmed findings, classify practical impact as:

* Critical
* High
* Medium
* Low
* Informational

Do not exaggerate severity.

Consider actual:

* query frequency;
* table-growth potential;
* request latency;
* resource consumption;
* production exposure;
* scalability;
* operational cost.

A theoretical optimization is not automatically a production problem.

---

# G. Recommended Direction — No Implementation

For each confirmed or partially applicable finding, explain:

* what the underlying problem actually is;
* whether the video's proposed solution fits this architecture;
* whether a smaller solution would be better;
* what parts of the system would likely need attention if we later decide to fix it;
* what should remain untouched;
* what runtime measurements should be collected before implementation.

Do NOT:

* edit code;
* create migrations;
* add indexes;
* change ORM queries;
* enable production logging;
* install monitoring;
* build dashboards;
* refactor database abstractions;
* commit anything.

This is an investigation only.

---

# Final Report

Keep the report concise and evidence-based.

Use this structure:

## Executive Result

One short paragraph explaining whether the video's concern appears relevant to this system.

## Findings

| Area                | Result                                                    | Impact               | Evidence         |
| ------------------- | --------------------------------------------------------- | -------------------- | ---------------- |
| Indexing            | Confirmed / Partial / Not Applicable / Needs Verification | High/Medium/Low/etc. | concise evidence |
| Field selection     | ...                                                       | ...                  | ...              |
| Query observability | ...                                                       | ...                  | ...              |

## Important Evidence

Only the most relevant:

* file paths;
* models;
* functions;
* routes;
* migrations;
* configuration.

## Runtime Verification Needed

List anything that cannot safely be determined from static code analysis, such as:

* actual table sizes;
* query execution plans;
* query frequency;
* production latency;
* CPU/I/O usage;
* slow-query statistics.

## Recommendation

For each finding:

**Proceed / Modify Recommendation / Reject / Gather More Evidence**

Explain why in one or two sentences.

## What Should Remain Untouched

Explicitly identify systems that do not need modification based on the current evidence.

---

**Stop after the audit report. Do not implement anything.**
