# Competitive Examination SaaS – Product Upgrade Specification

## Product Objective

Transform the existing application into a multi-tenant, white-label competitive-examination practice and performance-management platform for coaching institutes.

The platform must support competitive examinations such as JEE, COMEDK, AFCAT, GATE, SSC CGL, NEET and custom institute examinations.

The architecture must NOT hard-code individual examinations. Examination behaviour must be driven by configurable examination templates.

## User Roles

Implement:

1. Super Admin
2. Institute Admin
3. Faculty
4. Student
5. Parent

A parent account must be independently authenticated and linked to one or more student accounts.

## Multi-Tenant Organization Model

Create organizations/institutes with:

* institute name
* logo
* branding colours
* contact details
* academic year
* custom domain/subdomain
* WhatsApp notification configuration
* faculty accounts
* batches
* students
* parents

All organization data must be tenant-isolated.

## Student Management

Each student must have:

* profile
* organization
* batch
* examination tracks
* parent relationships
* assigned tests
* completed attempts
* scores
* rankings
* subject performance
* chapter performance
* topic performance
* attempt history

## Parent Dashboard

Parents must be able to:

* view linked students
* view latest test results
* view score history
* view subject performance
* view chapter/topic weaknesses
* view improvement trends
* view rankings where permitted
* open detailed test reports
* receive result notifications

Parents must not be able to modify student academic records.

## Question Bank

Implement a structured question bank.

Every question should support:

* question text
* images
* equations
* diagrams
* options
* correct answer
* explanation
* subject
* chapter
* topic
* subtopic
* difficulty
* question type
* marks
* negative marks
* source
* examination
* year
* language

Support bulk question import where practical.

## Question Types

Support at minimum:

* single-choice MCQ
* multiple-choice
* numerical answer
* assertion/reason
* match-the-following
* passage/comprehension
* image-based questions

Design the system so additional question types can be added without changing the core exam engine.

## Examination Template Engine

Create configurable exam templates containing:

* sections
* duration
* sectional duration
* question count
* marks
* negative marking
* sectional cutoffs
* navigation rules
* question randomization
* option randomization
* result rules
* ranking rules
* attempt rules
* language
* calculator availability
* proctoring requirements

Provide initial templates for:

* JEE-style CBT
* COMEDK-style CBT
* AFCAT-style CBT
* GATE-style CBT
* SSC CGL-style CBT
* NEET-style OMR/practice mode

Do not assume NEET is a CBT examination.

## CBT Examination Interface

Create an examination interface with:

* countdown timer
* section navigation
* question palette
* answered state
* unanswered state
* marked-for-review state
* answered-and-marked state
* previous/next navigation
* save-and-next
* clear response
* mark for review
* automatic submission
* connection recovery
* attempt persistence

The interface should visually simulate a professional competitive examination environment.

## OMR Practice Mode

Implement an OMR-style mode for examinations such as NEET.

Students should be able to:

* select answers against OMR-style question numbers
* review responses
* submit
* receive automatically evaluated results

Keep OMR mode architecturally separate from CBT mode while sharing the same underlying question, attempt and result models.

## Test Lifecycle

Tests must support:

* draft
* scheduled
* active
* completed
* archived

Tests may be assigned to:

* individual students
* batches
* examination groups

## Attempt Management

Every attempt must record:

* start time
* end time
* answers
* answer changes
* marked-for-review state
* time per question
* final score
* subject scores
* chapter scores
* topic scores
* accuracy
* attempted questions
* unattempted questions
* correct answers
* incorrect answers

Do not overwrite historical attempts.

## Results

After submission calculate:

* total score
* percentage
* attempted
* correct
* incorrect
* unattempted
* accuracy
* subject performance
* chapter performance
* topic performance
* difficulty-level performance
* rank
* batch average
* percentile where applicable

## Analytics

Implement dashboards for:

### Student

* score trend
* subject trend
* chapter strengths
* chapter weaknesses
* topic weaknesses
* difficulty analysis
* time analysis
* previous attempts
* recommended practice

### Parent

Provide simplified performance summaries and trends.

### Faculty

* student performance
* batch performance
* subject performance
* chapter performance
* topic performance
* difficult questions
* frequently incorrect questions
* question-level statistics

### Institute Admin

* institute-wide performance
* batch comparison
* test participation
* average scores
* weak chapters
* student rankings
* test completion statistics

## Weakness Detection

Automatically identify weak areas using configurable thresholds based on:

* accuracy
* attempted questions
* repeated incorrect answers
* time spent
* performance across multiple tests

Display:

* Strong
* Developing
* Needs Attention

These labels must be configurable by the institute.

## Retest / Practice

After each completed test provide:

* Review test
* View solutions
* Retry entire test
* Retry incorrect questions
* Retry unattempted questions
* Practice weak topics

Maintain separate attempt records for every retry.

## WhatsApp Notifications

Create a notification service abstraction supporting approved WhatsApp Business/API providers.

Support:

* test assignment
* test reminder
* test completion
* result notification
* weekly performance report
* parent notification

Messages should contain secure report links rather than exposing sensitive academic data unnecessarily.

## Report Links

Generate secure, authenticated report URLs.

Example:

/student/results/{attempt_id}

/parent/student/{student_id}/performance

Do not expose predictable IDs where this could create unauthorized access.

## Security

Implement:

* role-based access control
* organization-level tenant isolation
* secure authentication
* secure parent/student relationship validation
* protected result URLs
* audit logging
* server-side authorization for every academic resource

## Future AI Layer

Keep the architecture ready for:

* AI-generated questions
* AI-generated tests
* personalized practice
* weak-topic remediation
* automated performance summaries
* adaptive testing
* recommended study plans

Do NOT make AI a dependency of the core examination engine.

The core examination engine must work reliably without an AI API.

## Product Architecture Principle

The platform should be an assessment engine first and an LMS second.

Avoid hard-coding exam-specific behaviour.

The goal is:

Exam Template → Test → Attempt → Result → Analytics → Recommendation → Notification

This architecture must allow a coaching institute to create its own custom examination without requiring source-code changes.

## Implementation Priority

Phase 1:

* authentication
* organizations
* roles
* batches
* students
* parents
* question bank
* tests
* CBT engine
* attempts
* scoring
* results

Phase 2:

* analytics
* rankings
* chapter/topic analysis
* parent dashboard
* faculty dashboard
* institute dashboard
* WhatsApp notifications
* report links
* retest workflows

Phase 3:

* OMR mode
* proctoring
* AI recommendations
* AI question generation
* adaptive testing
* advanced reporting

Before modifying existing functionality, inspect the existing application's architecture, database schema, authentication flow, routes, components and APIs.

Reuse existing components wherever practical.

Do not rewrite the application unnecessarily.

Maintain backward compatibility with existing functionality unless a change is explicitly required by this specification.
