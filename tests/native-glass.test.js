import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import test from 'node:test';

const root = process.cwd();
const glassRoot = join(root, 'android', 'src', 'main', 'kotlin', 'org', 'jamealtafasir', 'mobile', 'ui', 'designsystem', 'glass');
const required = [
  'GlassSurface.kt', 'GlassCard.kt', 'GlassButton.kt', 'GlassSearchField.kt',
  'GlassTopBar.kt', 'GlassBottomNavigation.kt', 'GlassModalDrawer.kt',
  'GlassDialog.kt', 'GlassBottomSheet.kt', 'GlassDropdown.kt',
  'GlassTheme.kt', 'GlassAnimations.kt',
];

test('native Mansour glass design system is complete and avoids fake child blur', () => {
  for (const file of required) {
    const source = readFileSync(join(glassRoot, file), 'utf8');
    assert.ok(source.includes('package org.jamealtafasir.mobile.ui.designsystem.glass'), file);
  }
  const surface = readFileSync(join(glassRoot, 'GlassSurface.kt'), 'utf8');
  assert.doesNotMatch(surface, /Modifier\.blur\s*\(/);
  assert.match(surface, /borderGradient/);
  assert.match(surface, /lowPerformanceMode/);
});

test('Android activity loads the offline app through the native Compose shell', () => {
  const activity = readFileSync(join(root, 'android', 'src', 'main', 'java', 'org', 'jamealtafasir', 'mobile', 'MainActivity.java'), 'utf8');
  const shell = readFileSync(join(root, 'android', 'src', 'main', 'kotlin', 'org', 'jamealtafasir', 'mobile', 'ui', 'MansourShellHost.kt'), 'utf8');
  assert.match(activity, /MansourShellHost\.install/);
  assert.match(activity, /native-shell=1/);
  assert.match(shell, /GlassTopBar/);
  assert.match(shell, /GlassBottomNavigation/);
  assert.match(shell, /GlassModalDrawer/);
  assert.match(shell, /imePadding/);
});
