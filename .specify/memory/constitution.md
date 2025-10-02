# Brain Project Constitution

# Brain Project Constitution

<!--
HTML Comment: Sync Impact Report
Version Change: Template → 1.0.0
Modified Principles: All principles defined from template
Added Sections: All core sections established
Removed Sections: None (initial creation)
Templates Requiring Updates: ✅ All templates aligned with constitution
Follow-up TODOs: None - all placeholders resolved
-->

## Core Principles

### I. Simplicity First (NON-NEGOTIABLE)
Every solution MUST prioritize simplicity over cleverness. Code MUST be readable and understandable by a developer with limited experience. When choosing between a complex elegant solution and a simple working solution, always choose simple. Complex abstractions are prohibited unless absolutely necessary for core functionality.

**Rationale**: The primary user has limited coding experience and needs to understand and maintain the codebase. Learning and maintainability trump performance optimization in this context.

### II. Documentation as Code
Every component, function, and decision MUST be thoroughly documented. Code MUST include inline comments explaining not just what it does, but why it does it. Architecture decisions MUST be recorded with rationale. User-facing features MUST have clear setup and usage guides.

**Rationale**: Documentation enables learning, debugging, and future enhancement by a less experienced developer. It serves as both teaching material and reference.

### III. Test-Driven Development
Tests MUST be written before implementation. All user journeys MUST have corresponding E2E tests. Critical functions MUST have unit tests. Tests MUST fail before implementation begins and pass after implementation completes. No feature ships without test coverage.

**Rationale**: TDD ensures working functionality and provides confidence for future changes. Tests serve as executable documentation and prevent regressions.

### IV. Performance Accountability
Performance budgets MUST be defined and enforced: save operations <50ms, library rendering <200ms, search <120ms. All operations MUST be measured and logged. Performance regressions MUST be caught before deployment. User experience MUST never degrade due to technical debt.

**Rationale**: The app's utility depends on responsive performance. Performance budgets prevent gradual degradation and ensure user satisfaction.

### V. Privacy by Design
User data MUST remain local-first. AI integration MUST be user-controlled and optional. Sensitive data patterns MUST be sanitized before external API calls. Users MUST have complete control over their data and AI usage. No telemetry or analytics without explicit consent.

**Rationale**: Personal note-taking requires absolute privacy. Users must trust that their thoughts and information remain under their control.

## Technical Standards

### Technology Constraints
- **Core Technologies**: Vanilla JavaScript, HTML5, CSS3 only for main application
- **Dependencies**: Minimal essential libraries only (Dexie.js, Workbox, testing tools)
- **No Frameworks**: React, Vue, Angular, or similar frameworks are prohibited
- **Build Tools**: Vite for development only, vanilla output for production
- **Browser Support**: Modern browsers only (Chrome 90+, Firefox 88+, Safari 14+)

### Code Quality Standards
- **ES6+ Features**: Use modern JavaScript but maintain broad compatibility
- **Function Length**: Maximum 50 lines per function, prefer smaller
- **File Length**: Maximum 300 lines per module, split if larger
- **Naming**: Descriptive names over short clever names
- **Comments**: Every non-trivial function must have JSDoc comments
- **Error Handling**: All async operations must handle errors gracefully

### Performance Requirements
- **Bundle Size**: Total JavaScript <500KB gzipped
- **Initial Load**: First contentful paint <2 seconds
- **Offline First**: All core functionality must work without network
- **Memory Usage**: Maximum 50MB heap size with 1000 notes
- **Battery Impact**: No background processing that drains battery

## Development Workflow

### Implementation Process
1. **Specification Phase**: All features begin with written specification
2. **Test Writing**: E2E and unit tests written first, must fail
3. **Implementation**: Code written to make tests pass
4. **Documentation**: Inline comments, user guides, architecture notes
5. **Review**: Self-review for constitution compliance
6. **Deployment**: Automated testing and deployment pipeline

### Quality Gates
- **All tests pass**: No implementation ships with failing tests
- **Performance budgets met**: All operations within defined limits
- **Documentation complete**: Code, user guides, and decisions documented
- **Constitution compliance**: All principles adhered to without exception
- **Privacy verified**: No data leakage or unwanted external calls

### Change Management
- **Breaking Changes**: Require version bump and migration guide
- **New Dependencies**: Must be justified and documented
- **Performance Impact**: Must be measured and approved
- **API Changes**: Must maintain backward compatibility when possible
- **User Interface**: Must maintain accessibility and mobile usability

## Governance

### Constitution Authority
This constitution supersedes all other development practices and decisions. No feature, optimization, or convenience justifies violating these principles. When in doubt, choose the path that best serves the constitution's intent: enabling a beginner to understand, maintain, and enhance the codebase.

### Amendment Process
1. **Proposal**: Document proposed change with rationale
2. **Impact Analysis**: Assess effect on existing code and principles
3. **Migration Plan**: Define steps to align existing code
4. **Version Bump**: Increment constitution version appropriately
5. **Update Propagation**: Ensure all dependent templates stay synchronized

### Compliance Review
- **Every Task**: Must verify alignment with constitutional principles
- **Every Feature**: Must pass constitution compliance check
- **Every Deployment**: Must maintain all constitutional requirements
- **Regular Audits**: Quarterly review of adherence and effectiveness

### Complexity Justification
Any deviation from simplicity MUST be justified in writing with:
- **Problem Statement**: What specifically requires complexity
- **Alternatives Considered**: Why simpler approaches are insufficient  
- **Mitigation Plan**: How to minimize complexity impact
- **Documentation Plan**: How to explain the complex parts
- **Future Simplification**: Plan to reduce complexity when possible

**Version**: 1.0.0 | **Ratified**: 2024-12-19 | **Last Amended**: 2024-12-19