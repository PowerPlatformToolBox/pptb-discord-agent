/**
 * Path caching utility to reduce repeated path construction overhead
 * Caches commonly used file system paths to avoid redundant join() calls
 *
 * **Thread Safety Note:**
 * This implementation assumes single-threaded Node.js event loop.
 * Not safe for worker threads without additional synchronization.
 */

import { join } from 'node:path';

class PathCache {
  private readonly cache = new Map<string, string>();

  /**
   * Get or compute a cached path
   * @param key - Unique identifier for this path
   * @param pathFn - Function that constructs the path if not cached
   */
  public getPath(key: string, pathFn: () => string): string {
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }

    const path = pathFn();
    this.cache.set(key, path);
    return path;
  }

  /**
   * Clear the cache (useful for testing)
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size (useful for monitoring)
   */
  public size(): number {
    return this.cache.size;
  }
}

// Singleton instance (safe in single-threaded Node.js event loop)
let pathCacheInstance: PathCache | null = null;

export function getPathCache(): PathCache {
  if (!pathCacheInstance) {
    pathCacheInstance = new PathCache();
  }
  return pathCacheInstance;
}

/**
 * Helper to get commonly used application paths
 * Uses simple string escaping for cache keys to avoid hashing overhead
 */
export class AppPaths {
  private static cache = getPathCache();

  /**
   * Generate a safe cache key using escape sequences for special characters
   */
  private static getCacheKey(prefix: string, baseDir: string, ...parts: string[]): string {
    // Replace special characters with escaped versions to avoid collisions
    const safePath = baseDir.replace(/:/g, '::').replace(/\|/g, ':pipe:');
    const suffix = parts.length > 0 ? `|${parts.join('|')}` : '';
    return `${prefix}:${safePath}${suffix}`;
  }

  /**
   * Get handlers/commands directory path
   */
  public static getCommandsPath(baseDir: string): string {
    return this.cache.getPath(this.getCacheKey('commands', baseDir), () =>
      join(baseDir, 'handlers', 'commands')
    );
  }

  /**
   * Get handlers/events directory path
   */
  public static getEventsPath(baseDir: string): string {
    return this.cache.getPath(this.getCacheKey('events', baseDir), () =>
      join(baseDir, 'handlers', 'events')
    );
  }

  /**
   * Get command folder path
   */
  public static getCommandFolderPath(baseDir: string, folder: string): string {
    return this.cache.getPath(this.getCacheKey('commandFolder', baseDir, folder), () =>
      join(baseDir, 'handlers', 'commands', folder)
    );
  }
}
