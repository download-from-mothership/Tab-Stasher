import { createRequire as topLevelCreateRequire } from 'module';const require = topLevelCreateRequire(import.meta.url);import bannerUrl from 'url';const __dirname = bannerUrl.fileURLToPath(new URL('.', import.meta.url));

// node_modules/@opennextjs/cloudflare/dist/api/cloudflare-context.js
var cloudflareContextSymbol = Symbol.for("__cloudflare-context__");
function getCloudflareContext(options = { async: false }) {
  return options.async ? getCloudflareContextAsync() : getCloudflareContextSync();
}
function getCloudflareContextFromGlobalScope() {
  const global = globalThis;
  return global[cloudflareContextSymbol];
}
function inSSG() {
  const global = globalThis;
  return global.__NEXT_DATA__?.nextExport === true;
}
function getCloudflareContextSync() {
  const cloudflareContext = getCloudflareContextFromGlobalScope();
  if (cloudflareContext) {
    return cloudflareContext;
  }
  if (inSSG()) {
    throw new Error(`

ERROR: \`getCloudflareContext\` has been called in sync mode in either a static route or at the top level of a non-static one, both cases are not allowed but can be solved by either:
  - make sure that the call is not at the top level and that the route is not static
  - call \`getCloudflareContext({async: true})\` to use the \`async\` mode
  - avoid calling \`getCloudflareContext\` in the route
`);
  }
  throw new Error(initOpenNextCloudflareForDevErrorMsg);
}
async function getCloudflareContextAsync() {
  const cloudflareContext = getCloudflareContextFromGlobalScope();
  if (cloudflareContext) {
    return cloudflareContext;
  }
  const inNodejsRuntime = process.env.NEXT_RUNTIME === "nodejs";
  if (inNodejsRuntime || inSSG()) {
    const cloudflareContext2 = await getCloudflareContextFromWrangler();
    addCloudflareContextToNodejsGlobal(cloudflareContext2);
    return cloudflareContext2;
  }
  throw new Error(initOpenNextCloudflareForDevErrorMsg);
}
function addCloudflareContextToNodejsGlobal(cloudflareContext) {
  const global = globalThis;
  global[cloudflareContextSymbol] = cloudflareContext;
}
async function getCloudflareContextFromWrangler(options) {
  const { getPlatformProxy } = await import(
    /* webpackIgnore: true */
    `${"__wrangler".replaceAll("_", "")}`
  );
  const environment = options?.environment ?? process.env.NEXT_DEV_WRANGLER_ENV;
  const { env, cf, ctx } = await getPlatformProxy({
    ...options,
    environment
  });
  return {
    env,
    cf,
    ctx
  };
}
var initOpenNextCloudflareForDevErrorMsg = `

ERROR: \`getCloudflareContext\` has been called without having called \`initOpenNextCloudflareForDev\` from the Next.js config file.
You should update your Next.js config file as shown below:

   \`\`\`
   // next.config.mjs

   import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

   initOpenNextCloudflareForDev();

   const nextConfig = { ... };
   export default nextConfig;
   \`\`\`

`;

// node_modules/@opennextjs/cloudflare/dist/api/config.js
function defineCloudflareConfig(config = {}) {
  const { incrementalCache, tagCache, queue, cachePurge, enableCacheInterception = false, routePreloadingBehavior = "none" } = config;
  return {
    default: {
      override: {
        wrapper: "cloudflare-node",
        converter: "edge",
        proxyExternalRequest: "fetch",
        incrementalCache: resolveIncrementalCache(incrementalCache),
        tagCache: resolveTagCache(tagCache),
        queue: resolveQueue(queue),
        cdnInvalidation: resolveCdnInvalidation(cachePurge)
      },
      routePreloadingBehavior
    },
    // node:crypto is used to compute cache keys
    edgeExternals: ["node:crypto"],
    cloudflare: {
      useWorkerdCondition: true
    },
    dangerous: {
      enableCacheInterception
    },
    middleware: {
      external: true,
      override: {
        wrapper: "cloudflare-edge",
        converter: "edge",
        proxyExternalRequest: "fetch",
        incrementalCache: resolveIncrementalCache(incrementalCache),
        tagCache: resolveTagCache(tagCache),
        queue: resolveQueue(queue)
      }
    }
  };
}
function resolveIncrementalCache(value = "dummy") {
  if (typeof value === "string") {
    return value;
  }
  return typeof value === "function" ? value : () => value;
}
function resolveTagCache(value = "dummy") {
  if (typeof value === "string") {
    return value;
  }
  return typeof value === "function" ? value : () => value;
}
function resolveQueue(value = "dummy") {
  if (typeof value === "string") {
    return value;
  }
  return typeof value === "function" ? value : () => value;
}
function resolveCdnInvalidation(value = "dummy") {
  if (typeof value === "string") {
    return value;
  }
  return typeof value === "function" ? value : () => value;
}

// node_modules/@opennextjs/aws/dist/utils/error.js
var IgnorableError = class extends Error {
  __openNextInternal = true;
  canIgnore = true;
  logLevel = 0;
  constructor(message) {
    super(message);
    this.name = "IgnorableError";
  }
};
function isOpenNextError(e) {
  try {
    return "__openNextInternal" in e;
  } catch {
    return false;
  }
}

// node_modules/@opennextjs/aws/dist/adapters/logger.js
function debug(...args) {
  if (globalThis.openNextDebug) {
    console.log(...args);
  }
}
function warn(...args) {
  console.warn(...args);
}
var DOWNPLAYED_ERROR_LOGS = [
  {
    clientName: "S3Client",
    commandName: "GetObjectCommand",
    errorName: "NoSuchKey"
  }
];
var isDownplayedErrorLog = (errorLog) => DOWNPLAYED_ERROR_LOGS.some((downplayedInput) => downplayedInput.clientName === errorLog?.clientName && downplayedInput.commandName === errorLog?.commandName && (downplayedInput.errorName === errorLog?.error?.name || downplayedInput.errorName === errorLog?.error?.Code));
function error(...args) {
  if (args.some((arg) => isDownplayedErrorLog(arg))) {
    return debug(...args);
  }
  if (args.some((arg) => isOpenNextError(arg))) {
    const error2 = args.find((arg) => isOpenNextError(arg));
    if (error2.logLevel < getOpenNextErrorLogLevel()) {
      return;
    }
    if (error2.logLevel === 0) {
      return console.log(...args.map((arg) => isOpenNextError(arg) ? `${arg.name}: ${arg.message}` : arg));
    }
    if (error2.logLevel === 1) {
      return warn(...args.map((arg) => isOpenNextError(arg) ? `${arg.name}: ${arg.message}` : arg));
    }
    return console.error(...args);
  }
  console.error(...args);
}
function getOpenNextErrorLogLevel() {
  const strLevel = process.env.OPEN_NEXT_ERROR_LOG_LEVEL ?? "1";
  switch (strLevel.toLowerCase()) {
    case "debug":
    case "0":
      return 0;
    case "error":
    case "2":
      return 2;
    default:
      return 1;
  }
}

// node_modules/@opennextjs/cloudflare/dist/api/overrides/internal.js
import { createHash } from "node:crypto";
var debugCache = (name, ...args) => {
  if (process.env.NEXT_PRIVATE_DEBUG_CACHE) {
    console.log(`[${name}] `, ...args);
  }
};
var FALLBACK_BUILD_ID = "no-build-id";
var DEFAULT_PREFIX = "incremental-cache";
function computeCacheKey(key, options) {
  const { cacheType = "cache", prefix = DEFAULT_PREFIX, buildId = FALLBACK_BUILD_ID } = options;
  const hash = createHash("sha256").update(key).digest("hex");
  return `${prefix}/${buildId}/${hash}.${cacheType}`.replace(/\/+/g, "/");
}
async function purgeCacheByTags(tags) {
  const { env } = getCloudflareContext();
  if (env.NEXT_CACHE_DO_PURGE) {
    const durableObject = env.NEXT_CACHE_DO_PURGE;
    const id = durableObject.idFromName("cache-purge");
    const obj = durableObject.get(id);
    await obj.purgeCacheByTags(tags);
  } else {
    await internalPurgeCacheByTags(env, tags);
  }
}
async function internalPurgeCacheByTags(env, tags) {
  if (!env.CACHE_PURGE_ZONE_ID && !env.CACHE_PURGE_API_TOKEN) {
    debugCache("purgeCacheByTags", "No cache zone ID or API token provided. Skipping cache purge.");
    return "missing-credentials";
  }
  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${env.CACHE_PURGE_ZONE_ID}/purge_cache`, {
      headers: {
        Authorization: `Bearer ${env.CACHE_PURGE_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      method: "POST",
      body: JSON.stringify({
        tags
      })
    });
    if (response.status === 429) {
      debugCache("purgeCacheByTags", "Rate limit exceeded. Skipping cache purge.");
      return "rate-limit-exceeded";
    }
    const bodyResponse = await response.json();
    if (!bodyResponse.success) {
      debugCache("purgeCacheByTags", "Cache purge failed. Errors:", bodyResponse.errors.map((error2) => `${error2.code}: ${error2.message}`));
      return "purge-failed";
    }
    debugCache("purgeCacheByTags", "Cache purged successfully for tags:", tags);
    return "purge-success";
  } catch (error2) {
    console.error("Error purging cache by tags:", error2);
    return "purge-failed";
  }
}

// node_modules/@opennextjs/cloudflare/dist/api/overrides/incremental-cache/r2-incremental-cache.js
var NAME = "cf-r2-incremental-cache";
var BINDING_NAME = "NEXT_INC_CACHE_R2_BUCKET";
var PREFIX_ENV_NAME = "NEXT_INC_CACHE_R2_PREFIX";
var R2IncrementalCache = class {
  name = NAME;
  async get(key, cacheType) {
    const r2 = getCloudflareContext().env[BINDING_NAME];
    if (!r2)
      throw new IgnorableError("No R2 bucket");
    debugCache(`Get ${key}`);
    try {
      const r2Object = await r2.get(this.getR2Key(key, cacheType));
      if (!r2Object)
        return null;
      return {
        value: await r2Object.json(),
        lastModified: r2Object.uploaded.getTime()
      };
    } catch (e) {
      error("Failed to get from cache", e);
      return null;
    }
  }
  async set(key, value, cacheType) {
    const r2 = getCloudflareContext().env[BINDING_NAME];
    if (!r2)
      throw new IgnorableError("No R2 bucket");
    debugCache(`Set ${key}`);
    try {
      await r2.put(this.getR2Key(key, cacheType), JSON.stringify(value));
    } catch (e) {
      error("Failed to set to cache", e);
    }
  }
  async delete(key) {
    const r2 = getCloudflareContext().env[BINDING_NAME];
    if (!r2)
      throw new IgnorableError("No R2 bucket");
    debugCache(`Delete ${key}`);
    try {
      await r2.delete(this.getR2Key(key));
    } catch (e) {
      error("Failed to delete from cache", e);
    }
  }
  getR2Key(key, cacheType) {
    return computeCacheKey(key, {
      prefix: getCloudflareContext().env[PREFIX_ENV_NAME],
      buildId: process.env.NEXT_BUILD_ID,
      cacheType
    });
  }
};
var r2_incremental_cache_default = new R2IncrementalCache();

// node_modules/@opennextjs/cloudflare/dist/api/overrides/queue/do-queue.js
var do_queue_default = {
  name: "durable-queue",
  send: async (msg) => {
    const durableObject = getCloudflareContext().env.NEXT_CACHE_DO_QUEUE;
    if (!durableObject)
      throw new IgnorableError("No durable object binding for cache revalidation");
    const id = durableObject.idFromName(msg.MessageGroupId);
    const stub = durableObject.get(id);
    await stub.revalidate({
      ...msg
    });
  }
};

// node_modules/@opennextjs/aws/dist/core/routing/queue.js
function generateShardId(rawPath, maxConcurrency, prefix) {
  let a = cyrb128(rawPath);
  let t = a += 1831565813;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  const randomFloat = ((t ^ t >>> 14) >>> 0) / 4294967296;
  const randomInt = Math.floor(randomFloat * maxConcurrency);
  return `${prefix}-${randomInt}`;
}
function cyrb128(str) {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ h1 >>> 18, 597399067);
  h2 = Math.imul(h4 ^ h2 >>> 22, 2869860233);
  h3 = Math.imul(h1 ^ h3 >>> 17, 951274213);
  h4 = Math.imul(h2 ^ h4 >>> 19, 2716044179);
  h1 ^= h2 ^ h3 ^ h4, h2 ^= h1, h3 ^= h1, h4 ^= h1;
  return h1 >>> 0;
}

// node_modules/@opennextjs/cloudflare/dist/api/overrides/tag-cache/do-sharded-tag-cache.js
var DEFAULT_WRITE_RETRIES = 3;
var DEFAULT_NUM_SHARDS = 4;
var NAME2 = "do-sharded-tag-cache";
var SOFT_TAG_PREFIX = "_N_T_/";
var DEFAULT_REGION = "enam";
var AVAILABLE_REGIONS = ["enam", "weur", "apac", "sam", "afr", "oc"];
var DOId = class {
  options;
  shardId;
  replicaId;
  region;
  constructor(options) {
    this.options = options;
    const { baseShardId, shardType, numberOfReplicas, replicaId, region } = options;
    this.shardId = `tag-${shardType};${baseShardId}`;
    this.replicaId = replicaId ?? this.generateRandomNumberBetween(1, numberOfReplicas);
    this.region = region;
  }
  generateRandomNumberBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }
  get key() {
    return `${this.shardId};replica-${this.replicaId}${this.region ? `;region-${this.region}` : ""}`;
  }
};
var ShardedDOTagCache = class {
  opts;
  mode = "nextMode";
  name = NAME2;
  numSoftReplicas;
  numHardReplicas;
  maxWriteRetries;
  enableRegionalReplication;
  defaultRegion;
  localCache;
  constructor(opts = { baseShardSize: DEFAULT_NUM_SHARDS }) {
    this.opts = opts;
    this.numSoftReplicas = opts.shardReplication?.numberOfSoftReplicas ?? 1;
    this.numHardReplicas = opts.shardReplication?.numberOfHardReplicas ?? 1;
    this.maxWriteRetries = opts.maxWriteRetries ?? DEFAULT_WRITE_RETRIES;
    this.enableRegionalReplication = Boolean(opts.shardReplication?.regionalReplication);
    this.defaultRegion = opts.shardReplication?.regionalReplication?.defaultRegion ?? DEFAULT_REGION;
  }
  getDurableObjectStub(doId) {
    const durableObject = getCloudflareContext().env.NEXT_TAG_CACHE_DO_SHARDED;
    if (!durableObject)
      throw new IgnorableError("No durable object binding for cache revalidation");
    const id = durableObject.idFromName(doId.key);
    debug("[shardedTagCache] - Accessing Durable Object : ", {
      key: doId.key,
      region: doId.region
    });
    return durableObject.get(id, { locationHint: doId.region });
  }
  /**
   * Generates a list of DO ids for the shards and replicas
   * @param tags The tags to generate shards for
   * @param shardType Whether to generate shards for soft or hard tags
   * @param generateAllShards Whether to generate all shards or only one
   * @returns An array of TagCacheDOId and tag
   */
  generateDOIdArray({ tags, shardType, generateAllReplicas = false }) {
    let replicaIndexes = [1];
    const isSoft = shardType === "soft";
    let numReplicas = 1;
    if (this.opts.shardReplication) {
      numReplicas = isSoft ? this.numSoftReplicas : this.numHardReplicas;
      replicaIndexes = generateAllReplicas ? Array.from({ length: numReplicas }, (_, i) => i + 1) : [void 0];
    }
    const regionalReplicas = replicaIndexes.flatMap((replicaId) => {
      return tags.filter((tag) => isSoft ? tag.startsWith(SOFT_TAG_PREFIX) : !tag.startsWith(SOFT_TAG_PREFIX)).map((tag) => {
        return {
          doId: new DOId({
            baseShardId: generateShardId(tag, this.opts.baseShardSize, "shard"),
            numberOfReplicas: numReplicas,
            shardType,
            replicaId
          }),
          tag
        };
      });
    });
    if (!this.enableRegionalReplication)
      return regionalReplicas;
    const regionalReplicasInAllRegions = generateAllReplicas ? regionalReplicas.flatMap(({ doId, tag }) => {
      return AVAILABLE_REGIONS.map((region) => {
        return {
          doId: new DOId({
            baseShardId: doId.options.baseShardId,
            numberOfReplicas: numReplicas,
            shardType,
            replicaId: doId.replicaId,
            region
          }),
          tag
        };
      });
    }) : regionalReplicas.map(({ doId, tag }) => {
      doId.region = this.getClosestRegion();
      return { doId, tag };
    });
    return regionalReplicasInAllRegions;
  }
  getClosestRegion() {
    const continent = getCloudflareContext().cf?.continent;
    if (!continent)
      return this.defaultRegion;
    debug("[shardedTagCache] - Continent : ", continent);
    switch (continent) {
      case "AF":
        return "afr";
      case "AS":
        return "apac";
      case "EU":
        return "weur";
      case "NA":
        return "enam";
      case "OC":
        return "oc";
      case "SA":
        return "sam";
      default:
        return this.defaultRegion;
    }
  }
  /**
   * Same tags are guaranteed to be in the same shard
   * @param tags
   * @returns An array of DO ids and tags
   */
  groupTagsByDO({ tags, generateAllReplicas = false }) {
    const softTags = this.generateDOIdArray({ tags, shardType: "soft", generateAllReplicas });
    const hardTags = this.generateDOIdArray({ tags, shardType: "hard", generateAllReplicas });
    const tagIdCollection = [...softTags, ...hardTags];
    const tagsByDOId = /* @__PURE__ */ new Map();
    for (const { doId, tag } of tagIdCollection) {
      const doIdString = doId.key;
      const tagsArray = tagsByDOId.get(doIdString)?.tags ?? [];
      tagsArray.push(tag);
      tagsByDOId.set(doIdString, {
        // We override the doId here, but it should be the same for all tags
        doId,
        tags: tagsArray
      });
    }
    const result = Array.from(tagsByDOId.values());
    return result;
  }
  async getConfig() {
    const cfEnv = getCloudflareContext().env;
    const db = cfEnv.NEXT_TAG_CACHE_DO_SHARDED;
    if (!db)
      debugCache("No Durable object found");
    const isDisabled = !!globalThis.openNextConfig.dangerous?.disableTagCache;
    return !db || isDisabled ? { isDisabled: true } : {
      isDisabled: false,
      db
    };
  }
  async getLastRevalidated(tags) {
    const { isDisabled } = await this.getConfig();
    if (isDisabled)
      return 0;
    try {
      const shardedTagGroups = this.groupTagsByDO({ tags });
      const shardedTagRevalidationOutcomes = await Promise.all(shardedTagGroups.map(async ({ doId, tags: tags2 }) => {
        const cachedValue = await this.getFromRegionalCache({ doId, tags: tags2, type: "number" });
        if (cachedValue) {
          const cached = await cachedValue.text();
          try {
            return parseInt(cached, 10);
          } catch (e) {
            debug("Error while parsing cached value", e);
          }
        }
        const stub = this.getDurableObjectStub(doId);
        const _lastRevalidated = await stub.getLastRevalidated(tags2);
        if (!_lastRevalidated) {
          getCloudflareContext().ctx.waitUntil(this.putToRegionalCache({ doId, tags: tags2, type: "number" }, _lastRevalidated));
        }
        return _lastRevalidated;
      }));
      return Math.max(...shardedTagRevalidationOutcomes);
    } catch (e) {
      error("Error while checking revalidation", e);
      return 0;
    }
  }
  /**
   * This function checks if the tags have been revalidated
   * It is never supposed to throw and in case of error, it will return false
   * @param tags
   * @param lastModified default to `Date.now()`
   * @returns
   */
  async hasBeenRevalidated(tags, lastModified) {
    const { isDisabled } = await this.getConfig();
    if (isDisabled)
      return false;
    try {
      const shardedTagGroups = this.groupTagsByDO({ tags });
      const shardedTagRevalidationOutcomes = await Promise.all(shardedTagGroups.map(async ({ doId, tags: tags2 }) => {
        const cachedValue = await this.getFromRegionalCache({ doId, tags: tags2, type: "boolean" });
        if (cachedValue) {
          return await cachedValue.text() === "true";
        }
        const stub = this.getDurableObjectStub(doId);
        const _hasBeenRevalidated = await stub.hasBeenRevalidated(tags2, lastModified);
        if (!_hasBeenRevalidated) {
          getCloudflareContext().ctx.waitUntil(this.putToRegionalCache({ doId, tags: tags2, type: "boolean" }, _hasBeenRevalidated));
        }
        return _hasBeenRevalidated;
      }));
      return shardedTagRevalidationOutcomes.some((result) => result);
    } catch (e) {
      error("Error while checking revalidation", e);
      return false;
    }
  }
  /**
   * This function writes the tags to the cache
   * Due to the way shards and regional cache are implemented, the regional cache may not be properly invalidated
   * @param tags
   * @returns
   */
  async writeTags(tags) {
    const { isDisabled } = await this.getConfig();
    if (isDisabled)
      return;
    const shardedTagGroups = this.groupTagsByDO({ tags, generateAllReplicas: true });
    const currentTime = Date.now();
    await Promise.all(shardedTagGroups.map(async ({ doId, tags: tags2 }) => {
      await this.performWriteTagsWithRetry(doId, tags2, currentTime);
    }));
    await purgeCacheByTags(tags);
  }
  async performWriteTagsWithRetry(doId, tags, lastModified, retryNumber = 0) {
    try {
      const stub = this.getDurableObjectStub(doId);
      await stub.writeTags(tags, lastModified);
      await Promise.all([
        this.deleteRegionalCache({ doId, tags, type: "boolean" }),
        this.deleteRegionalCache({ doId, tags, type: "number" })
      ]);
    } catch (e) {
      error("Error while writing tags", e);
      if (retryNumber >= this.maxWriteRetries) {
        error("Error while writing tags, too many retries");
        await getCloudflareContext().env.NEXT_TAG_CACHE_DO_SHARDED_DLQ?.send({
          failingShardId: doId.key,
          failingTags: tags,
          lastModified
        });
        return;
      }
      await this.performWriteTagsWithRetry(doId, tags, lastModified, retryNumber + 1);
    }
  }
  // Cache API
  async getCacheInstance() {
    if (!this.localCache && this.opts.regionalCache) {
      this.localCache = await caches.open("sharded-do-tag-cache");
    }
    return this.localCache;
  }
  getCacheUrlKey(opts) {
    const { doId, tags, type } = opts;
    return `http://local.cache/shard/${doId.shardId}?type=${type}&tags=${encodeURIComponent(tags.join(";"))}`;
  }
  async getFromRegionalCache(opts) {
    try {
      if (!this.opts.regionalCache)
        return;
      const cache = await this.getCacheInstance();
      if (!cache)
        return;
      return cache.match(this.getCacheUrlKey(opts));
    } catch (e) {
      error("Error while fetching from regional cache", e);
    }
  }
  async putToRegionalCache(optsKey, value) {
    if (!this.opts.regionalCache)
      return;
    const cache = await this.getCacheInstance();
    if (!cache)
      return;
    const tags = optsKey.tags;
    await cache.put(this.getCacheUrlKey(optsKey), new Response(`${value}`, {
      headers: {
        "cache-control": `max-age=${this.opts.regionalCacheTtlSec ?? 5}`,
        ...tags.length > 0 ? {
          "cache-tag": tags.join(",")
        } : {}
      }
    }));
  }
  async deleteRegionalCache(optsKey) {
    try {
      if (!this.opts.regionalCache)
        return;
      const cache = await this.getCacheInstance();
      if (!cache)
        return;
      await cache.delete(this.getCacheUrlKey(optsKey));
    } catch (e) {
      debugCache("Error while deleting from regional cache", e);
    }
  }
};
var do_sharded_tag_cache_default = (opts) => new ShardedDOTagCache(opts);

// open-next.config.ts
var open_next_config_default = defineCloudflareConfig({
  incrementalCache: r2_incremental_cache_default,
  queue: do_queue_default,
  tagCache: do_sharded_tag_cache_default
});
export {
  open_next_config_default as default
};
