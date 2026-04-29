/* app/api/import-questions/route.ts */
import { NextResponse } from 'next/server';
import { parse } from 'papaparse';
import {
  getCbtCategoryByName,
  createCbtCategory,
  createCbtQuestion,
} from '@/lib/db/queries';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const cbtType = formData.get('cbtType') as 'mdcn' | 'mbbs';

  if (!file || !cbtType) {
    return NextResponse.json({ error: 'Missing file or cbtType' }, { status: 400 });
  }

  const csvText = await file.text();
  const results = parse(csvText, { header: true, skipEmptyLines: true });

  for (const row of results.data as any[]) {
    const categoryName = row['Category'];
    if (!categoryName) continue;

    // find or create category under the correct cbtType
    let category = await getCbtCategoryByName(categoryName);
    if (!category) {
      const slug = categoryName.toLowerCase().replace(/\s+/g, '-');
      category = await createCbtCategory(categoryName, slug, cbtType);
    }

    // build options array from CSV columns
    const options: { text: string; correct: boolean }[] = [];
    for (let i = 1; i <= 5; i++) {
      const text = row[`Answer ${i}`]?.trim();
      const correctRaw = row[`Answer ${i} Correct`]?.trim().toLowerCase();
      if (text) {
        options.push({ text, correct: correctRaw === 'yes' });
      }
    }

    // basic validation
    if (options.length < 2 || !options.some((o) => o.correct)) {
      console.warn(`Skipping question with no correct answer or <2 options`);
      continue;
    }

    // insert
    await createCbtQuestion({
      categoryId: category.id,
      content: row['Question Content'],
      explanation: row['Explanation'] || '',
      figureUrl: row['Figure URL'] || null,
      options,
    });
  }

  return NextResponse.json({ success: true });
}