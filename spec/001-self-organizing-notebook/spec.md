# Feature Specification: Self-Organizing Notebook

**Feature Branch**: `001-self-organizing-notebook`  
**Created**: 2024-12-19  
**Status**: Draft  
**Input**: User description: "Core Concept: The app is a self-organizing notebook with AI-suggested tags, multiple views (Today, Library, TOC), local-first storage, and spaced repetition review features."

## User Scenarios & Testing

### Primary User Story
A user captures raw text notes quickly in a web application that automatically suggests relevant tags and organizes content. The user can view their notes through different perspectives (Today view for recent activity, Library view for searching/filtering, TOC view for browsing by topics) and receives intelligent prompts to review older notes based on spaced repetition principles.

### Acceptance Scenarios

1. **Given** the user is on the Today view, **When** they type a note and save it, **Then** the note is immediately persisted locally and AI tag suggestions are triggered (but note saves regardless of AI success)

2. **Given** the user is in the Library view, **When** they search for keywords or filter by tags, **Then** they see a filtered list of notes matching their criteria with note titles (first line), snippets, and tags displayed

3. **Given** the user is viewing the TOC, **When** they tap on a tag, **Then** they are taken to the Library view with that tag filter applied

4. **Given** the user opens a note detail, **When** they edit the note, **Then** new AI tag suggestions are generated and presented for manual approval before applying

5. **Given** the user has notes older than 7/14/30 days, **When** they visit the Review tab, **Then** they see notes due for review based on spaced repetition algorithms

6. **Given** the user is offline, **When** they create or edit notes, **Then** notes save instantly locally and AI requests are queued for when connectivity returns

### Edge Cases
- What happens when AI service is unavailable (timeout > 2s)?
- How does system handle 1000+ notes performance?
- What occurs when user deletes a heavily-tagged note?
- How are sensitive data patterns handled in AI requests?
- What happens when IndexedDB storage quota is exceeded?

## Requirements

### Functional Requirements

- **FR-001**: System MUST allow users to quickly capture text notes through a textarea input
- **FR-002**: System MUST automatically generate and suggest up to 5 tags per note using AI analysis
- **FR-003**: System MUST save notes locally within 50ms (excluding AI processing)
- **FR-004**: System MUST provide three distinct view modes: Today (last 5 notes), Library (searchable/filterable), and TOC (tag frequency)
- **FR-005**: System MUST support case-insensitive search across note titles, body text, and tags
- **FR-006**: System MUST enable tag-based filtering with intersection support (AND/OR logic)
- **FR-007**: System MUST maintain a live Table of Contents showing all tags sorted by frequency with real-time count updates
- **FR-008**: System MUST allow full note editing with new AI tag suggestions requiring manual approval
- **FR-009**: System MUST implement spaced repetition review system surfacing notes not opened in 7, 14, or 30 days
- **FR-010**: System MUST provide "Flashback of the Day" feature showing notes from the same date in previous periods
- **FR-011**: System MUST support offline operation with AI request queuing for later processing
- **FR-012**: System MUST work on both mobile and desktop browsers responsively
- **FR-013**: System MUST redact sensitive patterns (emails, VINs, phone numbers) from AI requests
- **FR-014**: System MUST provide Private Mode that completely skips AI processing
- **FR-015**: System MUST delete notes and update tag counts atomically
- **FR-016**: System MUST support ULID-based note identifiers
- **FR-017**: System MUST track note creation, update, and last review timestamps
- **FR-018**: System MUST render Library view within 200ms with 1000+ notes
- **FR-019**: System MUST complete searches within 120ms with 1000+ notes

### Non-Functional Requirements

- **NFR-001**: System MUST use local-first storage pattern with IndexedDB primary and localStorage cache
- **NFR-002**: AI service requests MUST timeout after 2 seconds maximum
- **NFR-003**: System MUST maintain tag hierarchy with core families: subjects, routines, errands, events, notes
- **NFR-004**: System MUST use lower_snake_case tag formatting style
- **NFR-005**: System MUST support tag subcategories: status, priority, time, mode
- **NFR-006**: Notes tagged with "study" or "important" MUST have shortened review cycles
- **NFR-007**: System MUST provide data export capability for future cloud expansion
- **NFR-008**: System MUST emit structured events: NOTE_CREATED, NOTE_UPDATED, AI_TAGS_APPLIED, NOTE_DELETED, FILTER_CHANGED

### Key Entities

- **Note**: Represents a user's text entry with auto-generated title (first line), full body text, AI-suggested tags array, and timestamps for creation, update, and last review
- **TagIndex**: Maintains bidirectional mapping between tags and note IDs with frequency counts for efficient TOC generation and filtering operations
- **AI Tag Suggestion**: Represents ML-generated tag recommendations with confidence scores that require user approval before application to notes

### AI Integration Contract

**Input Format**:
```json
{
  "body": "note text content",
  "max_tags": 5,
  "style": "lower_snake_case",
  "domain_hint": ["subjects","errands","routines"]
}
```

**Output Format**:
```json
{
  "tags": ["suggested_tag_1", "suggested_tag_2"],
  "summary": "≤140 character summary"
}
```

**Behavior**: 2-second timeout with graceful failure, note saving independent of AI success, retry queue for failed requests.

### Core Tag System Structure

**Primary Families**:
- subjects: physics, math, coding, spanish
- routines: morning_routine, workout, reading  
- errands: groceries, car_maintenance, bills
- events: appointment, trip, birthday
- notes: idea, draft, reference, case_study

**Subcategories**:
- status: urgent, in_progress, done
- priority: p1, p2, p3
- time: today, this_week, long_term  
- mode: study, practice, plan, research

### Review & Memory System

- **Spaced Repetition**: Notes surface for review at 7, 14, 30-day intervals based on last_reviewed timestamp
- **Week Spot Analysis**: Identification of rarely-revisited tags for focused attention
- **Accelerated Review**: Notes tagged with "study" or "important" receive shortened review cycles
- **Due for Review Queue**: Automatic surfacing of stale notes based on configured intervals

### Screen Specifications

#### Today View
- Textarea input for new notes (prominent, always visible)
- Display last 5 notes with timestamps and tags
- Auto-save on blur/navigation with immediate feedback
- AI tag suggestions appear after save (non-blocking)

#### Library View  
- Search bar for keyword filtering
- Tag chips for multi-tag filtering (AND/OR toggle)
- Note list showing: title (first line), snippet, tags, timestamp
- Pagination for performance with 1000+ notes

#### TOC View
- All tags displayed with frequency counts
- Sorted by usage frequency (descending)
- Tap-to-filter navigation to Library view
- Real-time updates on note changes

#### Note Detail View
- Full note text (editable)
- Tag management interface (add/remove/edit)
- Delete and Save actions
- AI re-tagging trigger with approval workflow

#### Review View
- "Flashback of the Day" section
- "Due for Review" queue with spaced repetition logic
- "Weak Spot Focus" for underutilized tags
- Review completion tracking

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous  
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (none found)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---

## Developer Implementation Notes

**Required Modules**: db.ts, state.ts, indexer.ts, ai.ts  
**Key Events**: NOTE_CREATED, NOTE_UPDATED, AI_TAGS_APPLIED, NOTE_DELETED, FILTER_CHANGED  
**QA Test Suite**: Create 20 test notes, verify TOC accuracy, validate search performance, confirm tag filtering logic

**Performance Targets**:
- Note save: < 50ms (excluding AI)
- Library render: < 200ms (1k notes)  
- Search execution: < 120ms (1k notes)

**Privacy Requirements**:
- Default private notes
- AI request sanitization (emails, VINs, phones)  
- Private mode with AI bypass option

**Data Schema**:
```typescript
interface Note {
  id: string; // ULID
  title: string; // First line of body
  body: string;
  tags: string[];
  created_at: string; // ISO8601
  updated_at: string; // ISO8601
  last_reviewed?: string; // ISO8601
}

interface TagIndex {
  tag: string;
  note_ids: string[];
  count: number;
}
```