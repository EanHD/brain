<!--
Sync Impact Report:
- Version change: 1.0.0 → 2.0.0
- Project redefinition: Vehicle Data → Brain Notebook PWA Constitution
- Core principles: 10 vehicle data principles replaced with 7 software development principles
- Foundation: User-centric, learning-focused PWA development
- Templates requiring updates: ✅ aligned with plan-template.md, spec-template.md, tasks-template.md
- Added sections: Performance budgets, privacy safeguards, PWA standards
- Modified: Governance reflects personal project with learning focus
-->

# Brain Notebook PWA Constitution

## Foundation

You are developing Brain, a Progressive Web Application for personal knowledge management with AI-powered organization. Your role is to build maintainable, well-documented software that prioritizes simplicity, user privacy, and learning value. Quality and clarity override feature completeness or complexity.

## Core Principles

### I. Simplicity First (NON-NEGOTIABLE)
Use vanilla JavaScript, standard web APIs, and minimal dependencies. Avoid frameworks, complex build chains, or architectural patterns that obscure understanding. Code must be readable by intermediate developers.

**MUST**: Use vanilla JavaScript ES2022+ without frameworks
**MUST**: Keep dependencies minimal and well-justified
**MUST**: Prefer standard web APIs over third-party abstractions
**MUST NOT**: Introduce complexity that cannot be easily explained
**RATIONALE**: The project exists for learning and long-term personal maintainability

### II. Documentation as Code (NON-NEGOTIABLE)
Every function, module, and architectural decision must have clear inline documentation. READMEs must include setup instructions, architecture explanations, and learning resources. Comments should teach, not just describe.

**MUST**: Document all functions with purpose, parameters, returns, and examples
**MUST**: Include architecture diagrams and decision rationale in docs/
**MUST**: Provide comprehensive setup guides in README.md
**MUST**: Write comments that explain "why" not just "what"
**RATIONALE**: Future maintainer (you) needs to understand code months later without context

### III. Test-Driven Development (NON-NEGOTIABLE)
Write tests before implementation. All features must have E2E tests via Playwright and unit tests via Vitest. Contract tests must validate API integrations. Tests serve as executable documentation.

**MUST**: Write failing tests before implementation code
**MUST**: Maintain test coverage >80% for critical paths
**MUST**: Use contract tests for external APIs (OpenAI)
**MUST**: Include test scenarios in quickstart.md for each feature
**RATIONALE**: Tests prevent regressions and document expected behavior

### IV. Performance Accountability (NON-NEGOTIABLE)
Enforce strict performance budgets: <50ms note save, <200ms library render (1000 notes), <120ms search execution. Measure and log performance in development. Degrade gracefully under load.

**MUST**: Measure and enforce performance budgets in tests
**MUST**: Use Performance API for critical operations
**MUST**: Implement pagination/virtualization for large datasets
**MUST**: Log performance metrics in development mode
**RATIONALE**: PWA responsiveness directly impacts user experience and retention

### V. Privacy by Design (NON-NEGOTIABLE)
Default to local-first storage. AI features must be explicitly opt-in with user-controlled API keys. Redact sensitive patterns (emails, phone numbers, VINs) from AI requests. Provide complete Private Mode that bypasses all external services.

**MUST**: Store all data locally in IndexedDB (no cloud sync without explicit user action)
**MUST**: Require user-provided API key for AI features
**MUST**: Redact PII patterns before sending to AI services
**MUST**: Provide Private Mode toggle that completely disables external requests
**MUST**: Document data flows in docs/PRIVACY.md
**RATIONALE**: Personal notes contain sensitive information; user controls all data sharing

### VI. Progressive Web App Standards (NON-NEGOTIABLE)
Follow PWA best practices: offline-first, responsive design, app-like experience. Service worker must cache assets and handle offline gracefully. Manifest must enable installation. Mobile-first responsive design.

**MUST**: Implement service worker with offline support (Workbox)
**MUST**: Provide valid manifest.json for installation
**MUST**: Design mobile-first with responsive breakpoints
**MUST**: Queue offline operations for sync when online
**MUST**: Pass Lighthouse PWA audit with score ≥90
**RATIONALE**: PWA capabilities enable reliable, app-like experience across devices

### VII. Iterative Refinement (RECOMMENDED)
Build in small, testable increments. Validate each feature with real usage before adding the next. Maintain a living specification that evolves with understanding. Document learnings and trade-offs.

**SHOULD**: Implement features in small, mergeable chunks
**SHOULD**: Use real-world testing to validate assumptions
**SHOULD**: Update specs when requirements change during implementation
**SHOULD**: Document trade-offs and alternative approaches considered
**RATIONALE**: Personal projects benefit from flexibility and learning from mistakes

## Technical Standards

### Code Quality Gates
All code must meet these quality standards before merging:
- ESLint passes with no errors (warnings acceptable with justification)
- All tests pass (E2E and unit)
- Performance budgets met (<50ms save, <200ms render, <120ms search)
- Lighthouse PWA score ≥90
- No console errors in production build
- Documentation updated for changed features

### Architecture Constraints
- **Single-Page Application**: One HTML entry point (index.html)
- **Module Pattern**: ES modules with clear separation of concerns
- **Event-Driven**: Custom event system for component communication
- **Local-First**: IndexedDB primary storage, localStorage cache
- **Offline-Capable**: Service worker handles offline state gracefully
- **Responsive**: Mobile-first CSS with progressive enhancement

### AI Integration Rules
- **Timeout**: 2 seconds maximum for AI requests
- **Graceful Failure**: Note saves succeed even if AI fails
- **Queue Retry**: Failed AI requests queue for background retry
- **User Approval**: AI tag suggestions require explicit user confirmation
- **PII Redaction**: Automatically redact emails, phones, SSNs, VINs before sending
- **Private Mode**: Complete bypass of AI when user opts out

## Enforcement Protocol

### Development Workflow
1. **Specification Phase**: Write clear requirements in spec.md with acceptance criteria
2. **Contract Phase**: Define API contracts in YAML with expected inputs/outputs
3. **Test Phase**: Write failing E2E and unit tests based on contracts
4. **Implementation Phase**: Write minimal code to pass tests
5. **Documentation Phase**: Update inline docs, README, and API documentation
6. **Review Phase**: Verify constitution compliance before committing

### Code Review Checklist
- [ ] Vanilla JS with no unnecessary frameworks
- [ ] Comprehensive inline documentation
- [ ] All tests passing (E2E and unit)
- [ ] Performance budgets met
- [ ] Privacy patterns followed (PII redaction, local-first)
- [ ] PWA standards maintained (offline, responsive)
- [ ] README and docs updated

### Performance Monitoring
Monitor these metrics in development:
- Note save time (target: <50ms)
- Library render time with 1000 notes (target: <200ms)
- Search execution time with 1000 notes (target: <120ms)
- Initial page load (target: <2s)
- Time to Interactive (target: <3s)
- Lighthouse scores (target: ≥90 all categories)

## Governance

This constitution governs all development on the Brain PWA project. As a personal learning project, flexibility is valued, but the core principles (Simplicity, Documentation, Testing, Performance, Privacy, PWA Standards) are non-negotiable.

**Amendment Process**: 
- Constitutional changes require explicit documentation in git commit
- Version bump follows semantic versioning (MAJOR for principle changes)
- Impact on existing code must be assessed and documented
- Learning insights from amendments should be captured in docs/LEARNINGS.md

**Exception Handling**:
- Temporary violations for prototyping are acceptable if marked with TODO comments
- Production violations require explicit justification and remediation plan
- Performance budget misses require investigation and optimization before merge

**Review Authority**: 
As a solo project, self-review is required before commits. Use the checklist above. When in doubt, favor simplicity and documentation over cleverness.

**Version**: 2.0.0 | **Ratified**: 2025-10-03 | **Last Amended**: 2025-10-03