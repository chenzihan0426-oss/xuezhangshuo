import 'dotenv/config';
import { generateCompanyBrief } from '../lib/tongyi';

async function main() {
  const company = process.argv[2] ?? '腾讯';
  const industry = process.argv[3] ?? 'internet';
  const position = process.argv[4] ?? 'product_manager';
  console.log(`[probe] generateCompanyBrief("${company}", "${industry}", "${position}")...`);
  const t0 = Date.now();
  const brief = await generateCompanyBrief({ company, industry, position });
  console.log(`[probe] done in ${Date.now() - t0}ms | found=${brief.found} degraded=${brief.degraded ?? '-'}`);
  console.log('salary_range:', JSON.stringify(brief.salary_range, null, 2));
  console.log('correction:', JSON.stringify(brief.correction, null, 2));
  console.log(`events=${brief.events.length} sources=${brief.sources?.length ?? 0}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
