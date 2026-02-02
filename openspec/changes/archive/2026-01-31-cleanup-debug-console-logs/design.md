# Design: Cleanup Debug Console Logs

## Context

The GlobeScene component currently contains 7 `console.log` statements used during development to trace initialization, texture loading, and data updates. The App component passes `console.log` callbacks to `onReady` and `onError` props.

## Goals / Non-Goals

**Goals:**
- Remove all debug console.log statements from production code
- Maintain component functionality and callback invocations

**Non-Goals:**
- Adding a proper logging framework (future work)
- Adding environment-based conditional logging

## Decisions

### Decision 1: Simple removal over conditional logging

We'll simply remove the console.log statements rather than wrapping them in `__DEV__` checks or a logging utility. Rationale:
- The component already has proper callbacks for lifecycle events
- Consumers who need logging can add it in their callbacks
- Keeps the component clean and focused

### Decision 2: Remove App.tsx callback logging

Rather than keeping empty callbacks, we'll remove the `onReady` prop entirely from App.tsx since the callback isn't doing anything useful. The `onError` callback will be kept but with proper error handling (or removed if not needed).
