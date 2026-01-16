# Quickstart: 3D Globe Visualization

**Feature**: 001-3d-globe-visualization  
**Branch**: `001-3d-globe-visualization`  
**Last Updated**: 2025-10-22

## Prerequisites

Before starting development on this feature, ensure you have:

- **Node.js**: v20.x or later (check: `node --version`)
- **npm**: v9.x or later (check: `npm --version`)
- **Expo CLI**: Installed globally (`npm install -g @expo/cli`)
- **Git**: For branch management
- **iOS Simulator** (macOS only): Xcode with iOS 15+ simulator
- **Android Emulator**: Android Studio with Android 10+ emulator
- **Physical Device** (optional): Expo Go app installed for testing

**Environment Setup**:
```powershell
# Verify prerequisites
node --version     # Should be v20.x+
npm --version      # Should be v9.x+
npx expo --version # Should be ~0.24.x

# Clone repository (if not already done)
git clone https://github.com/jwhigham93/jw-dev.git
cd jw-dev

# Checkout feature branch
git checkout 001-3d-globe-visualization

# Install dependencies
npm install
```

---

## Installation

### Step 1: Install Dependencies

The feature requires `react-native-webview` for WebView-based globe rendering:

```powershell
# Install WebView dependency
npm install react-native-webview --save

# Verify installation
npm list react-native-webview
# Should show react-native-webview@^13.x.x
```

**Note**: No need to install `react-globe.gl` as an npm package. It will be loaded via CDN in the WebView HTML.

### Step 2: Verify Nx Configuration

Ensure the Expo app is configured correctly:

```powershell
# Check Nx project configuration
npx nx show project Globify --web

# Expected output should show targets: build, lint, test, typecheck, serve
```

---

## Running Locally

### Web Development (Fastest Iteration)

For rapid development and testing, start with the web version:

```powershell
# Start Expo web server
npx nx serve Globify

# Or using npm script
cd apps/Globify
npx expo start --web

# Server starts on http://localhost:8081
# Open in browser: Chrome, Firefox, Safari (WebGL required)
```

**Benefits**:
- Fastest hot-reload
- Chrome DevTools for debugging WebView (inspect globe.html)
- No simulator/emulator startup time

**Limitations**:
- Touch gestures simulate as mouse events (not identical to mobile)
- Performance may differ from mobile devices

---

### iOS Simulator

```powershell
# Start Expo with iOS simulator
npx nx run Globify:serve --platform=ios

# Or manually
cd apps/Globify
npx expo start

# Press 'i' in terminal to open iOS simulator
# Or scan QR code with camera on physical iOS device
```

**Requirements**:
- macOS only
- Xcode installed with iOS simulator
- First run may take 2-3 minutes to build

**Debugging**:
- Use Safari Developer menu → Connect to simulator → Inspect WebView
- Logs visible in Metro bundler terminal

---

### Android Emulator

```powershell
# Start Android emulator first (from Android Studio)
# Or via command line:
emulator -avd <AVD_NAME>

# Start Expo with Android
npx nx run Globify:serve --platform=android

# Or manually
cd apps/Globify
npx expo start

# Press 'a' in terminal to open Android
# Or scan QR code with Expo Go app
```

**Requirements**:
- Android Studio installed
- Android emulator created (API 29+)
- Android SDK configured

**Debugging**:
- Use Chrome DevTools → `chrome://inspect` → Inspect WebView
- Logs visible in Metro bundler terminal and Android Studio Logcat

---

## Testing

### Unit Tests

Run Jest tests for component logic and data models:

```powershell
# Run all tests for Globify app
npx nx test Globify

# Run specific test file
npx nx test Globify --testFile=GlobeVisualization.spec.tsx

# Run with coverage
npx nx test Globify --coverage

# Watch mode for TDD
npx nx test Globify --watch
```

**Test Files**:
- `apps/Globify/src/components/Globe/GlobeVisualization.spec.tsx` - Component tests
- `apps/Globify/src/components/Globe/useGlobeState.spec.ts` - Hook tests
- `apps/Globify/src/services/sampleData.spec.ts` - Data validation tests

**Coverage Target**: 80%+ for new code

---

### E2E Tests

Run Playwright tests for end-to-end visual validation:

```powershell
# Start Expo web server (required for E2E)
npx nx serve Globify

# In another terminal, run E2E tests
npx nx e2e Globify-e2e

# Run specific test file
npx nx e2e Globify-e2e --spec=globe-rendering.spec.ts

# Headed mode (see browser)
npx nx e2e Globify-e2e --headed

# Debug mode
npx nx e2e Globify-e2e --debug
```

**Test Scenarios**:
- Globe renders on page load
- Data points appear on globe
- Globe rotates on swipe/drag
- Globe zooms on pinch/scroll

**Requirements**:
- Expo web server running on port 8081
- Chromium browser (installed by Playwright)

---

## Development Workflow

### TDD Cycle (MANDATORY per Constitution)

Follow Red-Green-Refactor for all feature work:

1. **Write Test (RED)**:
   ```powershell
   # Create test file
   # Example: apps/Globify/src/components/Globe/GlobeVisualization.spec.tsx
   
   # Run test - should FAIL
   npx nx test Globify --testFile=GlobeVisualization.spec.tsx
   ```

2. **Implement Code (GREEN)**:
   ```powershell
   # Write minimal code to pass test
   # Example: apps/Globify/src/components/Globe/GlobeVisualization.tsx
   
   # Run test - should PASS
   npx nx test Globify --testFile=GlobeVisualization.spec.tsx
   ```

3. **Refactor (REFACTOR)**:
   ```powershell
   # Improve code quality without changing behavior
   
   # Re-run tests - should still PASS
   npx nx test Globify --testFile=GlobeVisualization.spec.tsx
   
   # Run linter
   npx nx lint Globify
   
   # Run type check
   npx nx typecheck Globify
   ```

4. **Commit**:
   ```powershell
   git add .
   git commit -m "feat(globe): implement GlobeVisualization component"
   ```

---

## Debugging

### WebView Debugging

**Web Platform**:
1. Open Chrome DevTools (F12)
2. Network tab → Verify `globe.html` loads
3. Console → Check for WebGL errors
4. Sources → Set breakpoints in globe.html script

**iOS Simulator**:
1. Safari → Develop menu → [Simulator Name] → localhost
2. Inspect WebView context
3. Console shows globe.html logs

**Android Emulator**:
1. Chrome → `chrome://inspect`
2. Find WebView under "Remote Target"
3. Click "inspect" → DevTools opens

### Common Issues

**Issue**: Globe doesn't render, shows white screen
**Solution**: Check Console for WebGL errors. Verify device supports WebGL. Try different browser/simulator.

**Issue**: `react-native-webview` module not found
**Solution**: Run `npm install react-native-webview`, restart Metro bundler.

**Issue**: Data points don't appear on globe
**Solution**: Check Network tab for texture loading errors. Verify `UPDATE_DATA` message sent after `READY` received.

**Issue**: Touch gestures don't work
**Solution**: Verify WebView `onTouchStart` handlers not blocked. Check gesture responders in React Native.

**Issue**: Expo web fails to start on port 8081
**Solution**: Kill existing process on 8081: `npx kill-port 8081`, restart server.

---

## Continuous Integration

CI pipeline runs on every push to feature branch:

```powershell
# Simulate CI locally
npx nx lint Globify
npx nx test Globify
npx nx typecheck Globify
npx nx build Globify-e2e # Just checks E2E compiles

# Fix any failures before pushing
```

**CI Workflow** (.github/workflows/ci.yml):
- Installs dependencies
- Runs ESLint
- Runs Jest tests
- Runs TypeScript compiler
- E2E tests (runs on web only in CI)

**Note**: Native builds (iOS/Android) use EAS Build separately, not run in CI.

---

## Helpful Commands

### Nx Commands

```powershell
# Show project graph (visualize dependencies)
npx nx graph

# See all targets for Globify
npx nx show project Globify

# Run multiple commands in parallel
npx nx run-many --target=test,lint --projects=Globify

# Clear Nx cache
npx nx reset
```

### Expo Commands

```powershell
# Clear Metro bundler cache
cd apps/Globify
npx expo start -c

# Show QR code for device testing
npx expo start --tunnel

# Check for Expo SDK updates
npx expo-doctor

# Generate native project for debugging
npx expo prebuild
```

### Git Workflow

```powershell
# Check current branch
git branch

# Pull latest changes
git pull origin 001-3d-globe-visualization

# Create checkpoint commit
git add .
git commit -m "wip: checkpoint before testing"

# Push to remote
git push origin 001-3d-globe-visualization
```

---

## Performance Profiling

### Measure FPS (Web)

```javascript
// Add to globe.html <script> section
let frameCount = 0;
let lastTime = performance.now();

function measureFPS() {
  frameCount++;
  const now = performance.now();
  if (now >= lastTime + 1000) {
    const fps = Math.round((frameCount * 1000) / (now - lastTime));
    console.log(`FPS: ${fps}`);
    frameCount = 0;
    lastTime = now;
  }
  requestAnimationFrame(measureFPS);
}
measureFPS();
```

### Measure FPS (Mobile)

Use React Native's performance monitor:
1. iOS Simulator: Cmd+D → "Show Perf Monitor"
2. Android Emulator: Cmd+M → "Show Perf Monitor"
3. Look for "JS FPS" and "UI FPS"

**Target**: 60 FPS for both metrics during rotation

---

## Troubleshooting

### Performance Issues (<50 FPS)

1. **Reduce texture size**: Edit globe.html, use lower-res texture
   ```javascript
   .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg') // Smaller file
   ```

2. **Reduce polygon count**: Simplify globe geometry
   ```javascript
   Globe({ polygonSideCount: 50 }) // Lower = fewer polygons
   ```

3. **Disable shadows**: Remove lighting/shadows in Three.js scene

4. **Test on physical device**: Simulators can be slower than real hardware

### Build Errors

```powershell
# Clean build
rm -rf node_modules package-lock.json
npm install

# Clear Nx cache
npx nx reset

# Clear Metro cache
cd apps/Globify
npx expo start -c
```

---

## Next Steps

Once local development environment is working:

1. ✅ Verify Expo web server starts on port 8081
2. ✅ Confirm WebView renders blank globe.html
3. ✅ Write first test (GlobeVisualization renders WebView)
4. ✅ Implement GlobeVisualization component (minimal)
5. ✅ Write test for UPDATE_DATA message
6. ✅ Implement UPDATE_DATA bridge logic
7. ✅ Continue TDD cycle per tasks.md (Phase 2)

---

## Resources

- **Expo Documentation**: https://docs.expo.dev/
- **Expo GLView**: https://docs.expo.dev/versions/latest/sdk/gl-view/
- **react-globe.gl**: https://github.com/vasturiano/react-globe.gl
- **react-native-webview**: https://github.com/react-native-webview/react-native-webview
- **Nx Documentation**: https://nx.dev/
- **Jest Testing**: https://jestjs.io/
- **Playwright E2E**: https://playwright.dev/

---

## Support

**Questions?** Check:
1. Feature spec: `specs/001-3d-globe-visualization/spec.md`
2. Data model: `specs/001-3d-globe-visualization/data-model.md`
3. WebView contract: `specs/001-3d-globe-visualization/contracts/webview-bridge.md`
4. Constitution: `.specify/memory/constitution.md`

**Issues?** Create GitHub issue or consult project maintainer.

---

**Status**: ✅ READY FOR DEVELOPMENT

**Phase 1 Quickstart**: ✅ COMPLETE
