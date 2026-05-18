// Node 端 stable hash 向量,验证跟 build_embeddings.py 一致
import { createHash } from 'node:crypto';

const VECTOR_DIM = 128;

function stableHashVector(text, dim = VECTOR_DIM) {
  let buf = createHash('sha256').update(text).digest();
  while (buf.length < dim * 4) {
    buf = Buffer.concat([buf, createHash('sha256').update(buf).digest()]);
  }
  const floats = [];
  for (let i = 0; i < dim; i++) {
    const u = buf.readUInt32LE(i * 4);
    floats.push((u / 0xffffffff) * 2 - 1);
  }
  const norm = Math.sqrt(floats.reduce((s, v) => s + v * v, 0)) || 1;
  return floats.map((v) => v / norm);
}

const samples = [
  'school_tier=3|major=computer_science|edu=本科|gpa=unknown|internships=0|top_intern=0',
  'school_tier=1|major=finance|edu=硕士|gpa=3.5+|internships=2|top_intern=1',
  'hello',
];

for (const s of samples) {
  const v = stableHashVector(s);
  console.log(`\nText: ${JSON.stringify(s)}`);
  console.log(`  dim=${v.length}`);
  console.log(`  first5=[${v.slice(0, 5).map((x) => x.toFixed(8)).join(', ')}]`);
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  console.log(`  norm=${norm.toFixed(6)}`);
}
