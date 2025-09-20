const fs = require('fs').promises;
const path = require('path');

class CacheManager {
  constructor() {
    this.cacheDir = path.join(__dirname, 'cache');
    this.maxCacheSize = 100; // Maximum number of cached items
    this.cacheTTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    this.initializeCache();
  }

  async initializeCache() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      console.log('📁 Cache directory initialized');
    } catch (error) {
      console.error('Failed to initialize cache directory:', error);
    }
  }

  generateCacheKey(url, selector) {
    // Create a safe filename from URL and selector
    const urlHash = Buffer.from(url).toString('base64').replace(/[/+=]/g, '');
    const selectorHash = Buffer.from(selector).toString('base64').replace(/[/+=]/g, '');
    return `${urlHash}_${selectorHash}`;
  }

  getCacheFilePath(key) {
    return path.join(this.cacheDir, `${key}.json`);
  }

  async get(url, selector) {
    try {
      const key = this.generateCacheKey(url, selector);
      const filePath = this.getCacheFilePath(key);
      
      const data = await fs.readFile(filePath, 'utf8');
      const cacheEntry = JSON.parse(data);
      
      // Check if cache entry is expired
      if (Date.now() - cacheEntry.timestamp > this.cacheTTL) {
        await this.delete(url, selector);
        return null;
      }
      
      return cacheEntry;
    } catch (error) {
      // File doesn't exist or can't be read
      return null;
    }
  }

  async set(url, selector, data) {
    try {
      const key = this.generateCacheKey(url, selector);
      const filePath = this.getCacheFilePath(key);
      
      const cacheEntry = {
        ...data,
        key,
        url,
        selector,
        timestamp: Date.now()
      };
      
      await fs.writeFile(filePath, JSON.stringify(cacheEntry, null, 2));
      
      // Clean up old cache entries if we exceed max size
      await this.cleanupOldEntries();
      
    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  }

  async delete(url, selector) {
    try {
      const key = this.generateCacheKey(url, selector);
      const filePath = this.getCacheFilePath(key);
      await fs.unlink(filePath);
    } catch (error) {
      // File doesn't exist, ignore error
    }
  }

  async clear() {
    try {
      const files = await fs.readdir(this.cacheDir);
      await Promise.all(
        files.map(file => fs.unlink(path.join(this.cacheDir, file)))
      );
      console.log('🗑️ Cache cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  async getStats() {
    try {
      const files = await fs.readdir(this.cacheDir);
      let totalSize = 0;
      let oldestEntry = Date.now();
      let newestEntry = 0;
      
      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
        
        if (stats.mtime.getTime() < oldestEntry) {
          oldestEntry = stats.mtime.getTime();
        }
        if (stats.mtime.getTime() > newestEntry) {
          newestEntry = stats.mtime.getTime();
        }
      }
      
      return {
        count: files.length,
        totalSizeBytes: totalSize,
        totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        oldestEntry: new Date(oldestEntry).toISOString(),
        newestEntry: new Date(newestEntry).toISOString(),
        maxCacheSize: this.maxCacheSize,
        cacheTTLHours: this.cacheTTL / (60 * 60 * 1000)
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        count: 0,
        totalSizeBytes: 0,
        totalSizeMB: 0,
        error: error.message
      };
    }
  }

  async cleanupOldEntries() {
    try {
      const files = await fs.readdir(this.cacheDir);
      
      if (files.length <= this.maxCacheSize) {
        return;
      }
      
      // Get file stats with timestamps
      const fileStats = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(this.cacheDir, file);
          const stats = await fs.stat(filePath);
          return {
            file,
            filePath,
            mtime: stats.mtime.getTime()
          };
        })
      );
      
      // Sort by modification time (oldest first)
      fileStats.sort((a, b) => a.mtime - b.mtime);
      
      // Remove oldest entries
      const toRemove = fileStats.slice(0, files.length - this.maxCacheSize);
      await Promise.all(
        toRemove.map(({ filePath }) => fs.unlink(filePath))
      );
      
      console.log(`🧹 Cleaned up ${toRemove.length} old cache entries`);
      
    } catch (error) {
      console.error('Failed to cleanup old entries:', error);
    }
  }
}

module.exports = { CacheManager };
