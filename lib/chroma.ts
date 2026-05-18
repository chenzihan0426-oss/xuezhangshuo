/**
 * Chroma 客户端封装(可选)
 *
 * V1 默认走 Supabase pgvector(match-engine 直接用 SQL)。
 * 本文件为未来切换 Chroma 准备。如果环境变量 CHROMA_URL 没设置,所有方法都会 no-op。
 */
import { ChromaClient, type Collection, type IncludeEnum } from 'chromadb';

let cached: ChromaClient | null = null;
let collectionPromise: Promise<Collection> | null = null;

export function getChromaClient(): ChromaClient | null {
  if (!process.env.CHROMA_URL) return null;
  if (!cached) cached = new ChromaClient({ path: process.env.CHROMA_URL });
  return cached;
}

export async function getSeniorPathsCollection(): Promise<Collection | null> {
  const client = getChromaClient();
  if (!client) return null;
  if (!collectionPromise) {
    const name = process.env.CHROMA_COLLECTION ?? 'senior_paths';
    collectionPromise = client.getOrCreateCollection({ name });
  }
  return collectionPromise;
}

export async function queryNearest(vec: number[], n = 1000) {
  const coll = await getSeniorPathsCollection();
  if (!coll) return [];
  const res = await coll.query({
    queryEmbeddings: [vec],
    nResults: n,
    include: ['metadatas', 'distances'] as IncludeEnum[],
  });
  const ids = res.ids[0] ?? [];
  const dists = res.distances?.[0] ?? [];
  return ids.map((id: string, i: number) => ({ id, distance: dists[i] ?? 1 }));
}
