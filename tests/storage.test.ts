import { describe, expect, it } from 'vitest';
import {
  mediaObjectPath,
  safeExtension,
  submissionObjectPath,
  thumbnailObjectPath,
} from '@/lib/storage';

/**
 * Storage paths.
 *
 * An uploader controls the filename. If any part of it reaches the storage key
 * unfiltered, a crafted name writes outside its own folder - so the rule is
 * that only a sanitised extension survives, and the name itself never does.
 */
const HOSTILE_NAMES = [
  '../../etc/passwd.jpg',
  '..\\..\\windows\\system32\\config.png',
  'a/b/c.jpg',
  'photo.jpg/../../escape.jpg',
  '....//....//x.png',
];

describe('submissionObjectPath', () => {
  it('never lets a crafted filename escape the submission folder', () => {
    for (const name of HOSTILE_NAMES) {
      const path = submissionObjectPath('SUB-123', name);
      expect(path.startsWith('SUB-123/'), path).toBe(true);
      expect(path, path).not.toContain('..');
      // Exactly one separator: the folder boundary we created ourselves.
      expect(path.split('/').length, path).toBe(2);
    }
  });

  it('gives every upload a unique key, so one cannot overwrite another', () => {
    const first = submissionObjectPath('SUB-123', 'photo.jpg');
    const second = submissionObjectPath('SUB-123', 'photo.jpg');
    expect(first).not.toBe(second);
  });
});

describe('mediaObjectPath', () => {
  it('keeps hostile names inside the listing folder', () => {
    for (const name of HOSTILE_NAMES) {
      const path = mediaObjectPath('prop123', name);
      expect(path.startsWith('prop123/'), path).toBe(true);
      expect(path, path).not.toContain('..');
    }
  });
});

describe('thumbnailObjectPath', () => {
  it('sits under the listing it belongs to', () => {
    expect(thumbnailObjectPath('prop123')).toMatch(
      /^prop123\/thumbs\/[\w-]+\.webp$/,
    );
  });
});

describe('safeExtension', () => {
  it('reduces anything to a short alphanumeric extension', () => {
    expect(safeExtension('photo.JPG')).toBe('jpg');
    expect(safeExtension('archive.tar.gz')).toBe('gz');
    expect(safeExtension('no-extension')).toBe('bin');
    expect(safeExtension('x.' + 'a'.repeat(50))).toHaveLength(5);
  });

  it('never returns anything that could act as a path separator', () => {
    for (const name of HOSTILE_NAMES) {
      expect(safeExtension(name)).not.toMatch(/[/\\.]/);
    }
  });
});

describe('safeExtension edge cases', () => {
  it('treats a name with no dot as having no extension', () => {
    expect(safeExtension('no-extension')).toBe('bin');
    expect(safeExtension('passwd')).toBe('bin');
  });

  it('treats a dotfile as having no extension', () => {
    expect(safeExtension('.gitignore')).toBe('bin');
    expect(safeExtension('.env')).toBe('bin');
  });
});
