import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

const VERSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Cache مع invalidation بالـ namespace:
 * كل namespace إله رقم نسخة (version) داخل مفتاح الـ cache. أي تعديل بيزيد الرقم
 * فكل المفاتيح القديمة بتصير غير قابلة للوصول فورًا (بدون الحاجة لمسح مفاتيح بالباترن).
 * هيك الشاب بيشوف دايمًا آخر نسخة بعد أي تعديل.
 */
@Injectable()
export class AppCacheService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  private async version(ns: string): Promise<number> {
    return (await this.cache.get<number>(`ver:${ns}`)) ?? 0;
  }

  async remember<T>(ns: string, key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
    const fullKey = `${ns}:${await this.version(ns)}:${key}`;
    const hit = await this.cache.get<T>(fullKey);
    if (hit !== undefined && hit !== null) return hit;
    const value = await load();
    await this.cache.set(fullKey, value, ttlMs);
    return value;
  }

  async invalidate(ns: string): Promise<void> {
    await this.cache.set(`ver:${ns}`, (await this.version(ns)) + 1, VERSION_TTL_MS);
  }
}
