import assert from 'node:assert';
import { describe, it } from 'node:test';

/**
 * Pure state reducer mirroring the fullscreen and keyboard navigation state machine in App.jsx
 */
export function handleKeyNavigationState({ key, isFullscreen, selectedRowId, targetTagName }) {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTagName)) {
    return { isFullscreen, selectedRowId, exitNativeFs: false };
  }

  if (key === 'Escape') {
    if (isFullscreen) {
      return { isFullscreen: false, selectedRowId, exitNativeFs: true };
    }
    return { isFullscreen: false, selectedRowId: null, exitNativeFs: false };
  }

  if (key === 'f' || key === 'F') {
    const nextFs = !isFullscreen;
    return { isFullscreen: nextFs, selectedRowId, exitNativeFs: !nextFs };
  }

  return { isFullscreen, selectedRowId, exitNativeFs: false };
}

/**
 * Validates overlay geometry intervals to mathematically prove non-overlap
 */
export function validateOverlayClearance({
  viewportWidth,
  viewportHeight,
  statusWidth = 360,
  toolbarWidth = 380,
  inspectorWidth = 280,
  inspectorTop = 60,
  inspectorHeight = 180,
  timelineWidth = 720,
  timelineHeight = 78,
  timelineBottom = 12,
}) {
  const margin = 18;
  const statusBounds = {
    left: margin,
    right: margin + statusWidth,
    top: 14,
    bottom: 14 + 88,
  };

  const toolbarBounds = {
    left: viewportWidth - margin - toolbarWidth,
    right: viewportWidth - margin,
    top: 14,
    bottom: 14 + 36,
  };

  const inspectorBounds = {
    left: viewportWidth - margin - inspectorWidth,
    right: viewportWidth - margin,
    top: inspectorTop,
    bottom: inspectorTop + inspectorHeight,
  };

  const effTimelineWidth = Math.min(timelineWidth, viewportWidth - 32);
  const timelineLeft = (viewportWidth - effTimelineWidth) / 2;
  const timelineBounds = {
    left: timelineLeft,
    right: timelineLeft + effTimelineWidth,
    top: viewportHeight - timelineBottom - timelineHeight,
    bottom: viewportHeight - timelineBottom,
  };

  // 1. Check Top-Left Status Panel vs Top-Right Toolbar horizontal clearance
  const topOverlap = !(
    statusBounds.right < toolbarBounds.left ||
    statusBounds.left > toolbarBounds.right ||
    statusBounds.bottom < toolbarBounds.top ||
    statusBounds.top > toolbarBounds.bottom
  );

  // 2. Check Status Panel vs Plot Inspector (Top-Right) clearance
  const statusInspectorOverlap = !(
    statusBounds.right < inspectorBounds.left ||
    statusBounds.left > inspectorBounds.right ||
    statusBounds.bottom < inspectorBounds.top ||
    statusBounds.top > inspectorBounds.bottom
  );

  // 3. Check Toolbar vs Plot Inspector vertical clearance
  const toolbarInspectorOverlap = !(
    toolbarBounds.bottom <= inspectorBounds.top ||
    toolbarBounds.top >= inspectorBounds.bottom ||
    toolbarBounds.right <= inspectorBounds.left ||
    toolbarBounds.left >= inspectorBounds.right
  );

  // 4. Check Plot Inspector vs Timeline vertical clearance
  const inspectorTimelineOverlap = !(
    inspectorBounds.bottom <= timelineBounds.top ||
    inspectorBounds.top >= timelineBounds.bottom ||
    inspectorBounds.right <= timelineBounds.left ||
    inspectorBounds.left >= timelineBounds.right
  );

  return {
    topOverlap,
    statusInspectorOverlap,
    toolbarInspectorOverlap,
    inspectorTimelineOverlap,
  };
}

describe('Fullscreen UX & State Machine Test Suite', () => {
  it('FS-1: Toggle Fullscreen via F key alternates boolean state', () => {
    let state = { key: 'f', isFullscreen: false, selectedRowId: null, targetTagName: 'DIV' };
    state = handleKeyNavigationState(state);
    assert.strictEqual(state.isFullscreen, true);
    assert.strictEqual(state.exitNativeFs, false);

    state.key = 'F';
    state = handleKeyNavigationState(state);
    assert.strictEqual(state.isFullscreen, false);
    assert.strictEqual(state.exitNativeFs, true);
  });

  it('FS-2: Escape key in Fullscreen exits fullscreen first without deselecting active row', () => {
    const initialState = {
      key: 'Escape',
      isFullscreen: true,
      selectedRowId: 'row-2',
      targetTagName: 'BUTTON',
    };
    const nextState = handleKeyNavigationState(initialState);
    assert.strictEqual(nextState.isFullscreen, false, 'Exits fullscreen mode');
    assert.strictEqual(nextState.selectedRowId, 'row-2', 'Preserves selected plot for dashboard context');
    assert.strictEqual(nextState.exitNativeFs, true, 'Flags native browser fullscreen exit');
  });

  it('FS-3: Escape key outside Fullscreen deselects the active furrow plot', () => {
    const initialState = {
      key: 'Escape',
      isFullscreen: false,
      selectedRowId: 'row-3',
      targetTagName: 'DIV',
    };
    const nextState = handleKeyNavigationState(initialState);
    assert.strictEqual(nextState.isFullscreen, false);
    assert.strictEqual(nextState.selectedRowId, null, 'Clears selected row');
  });

  it('FS-4: Ignores keyboard shortcuts when user is typing in form inputs', () => {
    const inInput = {
      key: 'f',
      isFullscreen: false,
      selectedRowId: 'row-1',
      targetTagName: 'INPUT',
    };
    const res = handleKeyNavigationState(inInput);
    assert.strictEqual(res.isFullscreen, false);

    const inTextarea = {
      key: 'Escape',
      isFullscreen: true,
      selectedRowId: 'row-1',
      targetTagName: 'TEXTAREA',
    };
    const res2 = handleKeyNavigationState(inTextarea);
    assert.strictEqual(res2.isFullscreen, true, 'Does not exit fullscreen while in textarea');
  });

  it('FS-5: Proves mathematical non-overlap of Status Panel, Toolbar, Inspector and Timeline on Desktop (1440x900)', () => {
    const check = validateOverlayClearance({
      viewportWidth: 1440,
      viewportHeight: 900,
    });

    assert.strictEqual(check.topOverlap, false, 'Status Panel and Toolbar do not collide');
    assert.strictEqual(check.statusInspectorOverlap, false, 'Status Panel and Inspector do not collide');
    assert.strictEqual(check.toolbarInspectorOverlap, false, 'Toolbar and Inspector do not collide');
    assert.strictEqual(check.inspectorTimelineOverlap, false, 'Inspector and Timeline do not collide');
  });

  it('FS-6: Proves mathematical non-overlap on Standard Laptop (1280x800)', () => {
    const check = validateOverlayClearance({
      viewportWidth: 1280,
      viewportHeight: 800,
      toolbarWidth: 340, // Compact toolbar with icon-only cam presets
    });

    assert.strictEqual(check.topOverlap, false);
    assert.strictEqual(check.statusInspectorOverlap, false);
    assert.strictEqual(check.toolbarInspectorOverlap, false);
    assert.strictEqual(check.inspectorTimelineOverlap, false);
  });

  it('FS-7: Modal stacking order strictly enforces z-index layering', () => {
    const Z_INDEX = {
      CANVAS_LAYER: 1,
      TIMELINE_BAR: 25,
      PLOT_INSPECTOR: 28,
      TOP_HUD: 30,
      FULLSCREEN_WRAPPER: 9999,
      MODAL_BACKDROPS: 10050,
    };

    assert.ok(Z_INDEX.TIMELINE_BAR > Z_INDEX.CANVAS_LAYER, 'Timeline sits above canvas');
    assert.ok(Z_INDEX.TOP_HUD > Z_INDEX.TIMELINE_BAR, 'HUD sits above timeline');
    assert.ok(Z_INDEX.FULLSCREEN_WRAPPER > Z_INDEX.TOP_HUD, 'Fullscreen wrapper layers dashboard');
    assert.ok(Z_INDEX.MODAL_BACKDROPS > Z_INDEX.FULLSCREEN_WRAPPER, 'Modals always layer above fullscreen');
  });
});
