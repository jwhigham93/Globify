<!--
  SYNC IMPACT REPORT
  ==================
  Version Change: [INITIAL] → 1.0.0
  Date: 2025-10-22
  
  Modified Principles:
  - NEW: I. Expo Best Practices
  - NEW: II. Component-Driven Architecture
  - NEW: III. Test-First Development (NON-NEGOTIABLE)
  
  Added Sections:
  - Technology Stack Constraints
  - Development Standards
  
  Templates Requiring Updates:
  ✅ plan-template.md - Constitution Check section already generic
  ✅ spec-template.md - Requirements sections align with principles
  ✅ tasks-template.md - Test-first workflow already enforced
  
  Follow-up TODOs:
  - None
-->

# Globify Development Constitution

## Core Principles

### I. Expo Best Practices

All development MUST adhere to current Expo best practices and conventions:
- Follow [Expo documentation](https://docs.expo.dev/) as the authoritative source
- Use Expo SDK features and APIs over custom React Native implementations
- Leverage Expo's managed workflow capabilities (EAS Build, EAS Update, etc.)
- Stay current with Expo SDK updates and migration guides
- Prefer Expo-compatible libraries from the [React Native Directory](https://reactnative.directory/)

**Rationale**: Expo provides a curated, well-tested ecosystem that reduces platform-specific bugs, simplifies builds and deployments, and ensures cross-platform compatibility. Following best practices prevents technical debt and maintains upgrade paths.

### II. Component-Driven Architecture

UI development MUST use Gluestack UI as the component library foundation:
- All UI components MUST be built using [Gluestack UI](https://gluestack.io/ui/docs/home/overview/quick-start) primitives
- Custom components MUST extend or compose Gluestack components, not replace them
- Follow Gluestack's theming and styling conventions (NativeWind integration)
- State management MUST use React Hooks (useState, useEffect, useContext, custom hooks)
- NO external state management libraries (Redux, MobX, Zustand, etc.) unless explicitly justified

**Rationale**: Gluestack UI provides accessible, cross-platform components with consistent styling and behavior. React Hooks offer sufficient state management capabilities for mobile apps while keeping the bundle size small and complexity low. This constraint prevents over-engineering and maintains simplicity.

### III. Test-First Development (NON-NEGOTIABLE)

Test-Driven Development is MANDATORY for all feature work:
- Tests MUST be written BEFORE implementation
- Tests MUST fail initially, proving they test the feature
- Implementation proceeds ONLY after tests are written and approved
- Red-Green-Refactor cycle MUST be strictly followed
- All code changes MUST include corresponding test coverage

**Rationale**: TDD ensures features are testable from inception, prevents regressions, documents expected behavior, and improves code quality. The upfront investment in tests saves debugging time and increases confidence in deployments.

## Technology Stack Constraints

**Framework**: Expo SDK (latest stable version)
**UI Library**: Gluestack UI with NativeWind for styling
**Language**: TypeScript (strict mode)
**State Management**: React Hooks only (no external libraries)
**Testing**: Jest + React Testing Library + Playwright for E2E
**Monorepo**: Nx workspace for project organization
**Platform Targets**: iOS, Android, Web (via Expo)

**Prohibited Libraries**:
- External state management (Redux, MobX, Zustand, Recoil)
- Non-Expo-compatible native modules (unless absolutely necessary and documented)
- UI libraries other than Gluestack UI (Material UI, React Native Paper, etc.)

**Exceptions**: If a prohibited technology is truly required, it MUST be documented in the feature plan with:
- Clear justification of why standard approaches are insufficient
- Analysis of alternatives considered and rejected
- Migration/removal plan if the need becomes obsolete

## Development Standards

**Code Quality**:
- All code MUST pass ESLint and TypeScript checks
- All code MUST be formatted with Prettier
- All files MUST have TypeScript strict mode enabled
- All exports MUST have TypeScript type annotations

**Testing Requirements**:
- Unit tests for all business logic and utilities
- Component tests for all UI components
- Integration tests for complex user workflows
- E2E tests for critical user journeys (when specified in feature spec)
- Minimum 80% code coverage for new code

**Documentation**:
- All exported functions/components MUST have TSDoc comments
- Complex logic MUST be explained with inline comments
- Feature specs MUST be created before implementation
- API contracts MUST be documented in spec contracts/

**Commit Standards**:
- Follow Conventional Commits format (feat:, fix:, docs:, chore:, etc.)
- Each commit MUST represent a single logical change
- Commit after each completed task or logical checkpoint
- All commits MUST pass lint, typecheck, and tests in CI

## Governance

This constitution supersedes all other development practices and conventions. All code reviews, pull requests, and feature planning MUST verify compliance with these principles.

**Amendment Process**:
- Constitution changes require explicit documentation of rationale
- Version number MUST be incremented per semantic versioning rules
- Breaking changes require migration plan for existing code
- All amendments MUST be approved before implementation

**Compliance**:
- All pull requests MUST pass automated checks (lint, test, typecheck)
- Code reviewers MUST verify adherence to core principles
- Non-compliance MUST be justified in writing or corrected
- Unjustified violations will block merge

**Versioning**:
- MAJOR: Backward incompatible principle changes or removals
- MINOR: New principles or expanded guidance
- PATCH: Clarifications, wording fixes, non-semantic updates

For runtime development guidance and agent-specific instructions, refer to `.github/prompts/` and `AGENTS.md`.

**Version**: 1.0.0 | **Ratified**: 2025-10-22 | **Last Amended**: 2025-10-22
