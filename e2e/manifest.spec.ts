// Guards what the Chrome Web Store reviews: the shipped manifest must not ask
// for more than Flick uses. Justifications live in docs/STORE_LISTING.md.
import fs from 'node:fs';
import { expect, test } from '@playwright/test';

const readManifest = (dir: string) =>
  JSON.parse(fs.readFileSync(`${dir}/chrome-mv3/manifest.json`, 'utf8'));

test('production manifest requests only the expected permissions', () => {
  const manifest = readManifest('.output');
  expect([...manifest.permissions].sort()).toEqual(
    ['activeTab', 'bookmarks', 'browsingData', 'scripting', 'sidePanel', 'storage', 'tabs'].sort(),
  );
  expect(manifest.optional_permissions).toEqual(['history']);
  // No broad host access: activeTab (granted by the shortcut / toolbar click)
  // covers everything, which keeps Flick out of the store's in-depth review.
  expect(manifest.host_permissions).toBeUndefined();
  expect(manifest.content_scripts).toBeUndefined();
  expect(manifest.web_accessible_resources).toBeUndefined();
});

test('E2E build only differs by host access', () => {
  const prod = readManifest('.output');
  const e2e = readManifest('.output-e2e');
  expect(e2e.host_permissions).toEqual(['<all_urls>']);
  delete e2e.host_permissions;
  expect(e2e).toEqual(prod);
});
