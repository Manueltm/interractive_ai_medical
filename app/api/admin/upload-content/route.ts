// app/api/admin/upload-content/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { 
  clincher, 
  miniMockCBT, 
  mainMockCBT, 
  miniMockOSCE, 
  mainMockOSCE,
  qblock, 
  qtopic,
  game,
  gameQuestion, 
  quizQuestion,
  quizCategory,
  academyCategory 
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// Dynamic imports for optional dependencies
let parse: any;
let XLSX: any;

// Try to load dependencies, handle gracefully if not installed
try {
  parse = require('csv-parse/sync');
} catch (e) {
  console.warn('csv-parse not installed, CSV uploads will fail');
}

try {
  XLSX = require('xlsx');
} catch (e) {
  console.warn('xlsx not installed, Excel uploads will fail');
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read file content
    const buffer = Buffer.from(await file.arrayBuffer());
    let records: any[] = [];

    // Parse based on file type
    if (file.name.endsWith('.csv')) {
      if (!parse) {
        return NextResponse.json({ error: 'CSV parsing library not installed' }, { status: 500 });
      }
      const content = buffer.toString('utf-8');
      records = parse.parse(content, { columns: true, skip_empty_lines: true });
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      if (!XLSX) {
        return NextResponse.json({ error: 'Excel parsing library not installed' }, { status: 500 });
      }
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      records = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    // Process based on type
    let savedCount = 0;
    const errors: string[] = [];
    
    for (const record of records) {
      try {
        switch (type) {
          case 'clincher': {
            // Get or create category
            let clincherCategoryId = null;
            if (record.Category) {
              // Check if category already exists
              const existingCategory = await db
                .select()
                .from(academyCategory)
                .where(eq(academyCategory.name, String(record.Category)))
                .limit(1);
              
              if (existingCategory.length > 0) {
                clincherCategoryId = existingCategory[0].id;
              } else {
                // Create new category
                const [category] = await db
                  .insert(academyCategory)
                  .values({
                    name: String(record.Category),
                    type: 'clincher',
                    createdById: session.user.id
                  })
                  .returning();
                
                if (category) clincherCategoryId = category.id;
              }
            }

            await db.insert(clincher).values({
              question: String(record.Question || ''),
              answer: String(record.Answer || ''),
              mainFigureUrl: record['Main Figure URL'] ? String(record['Main Figure URL']) : null,
              categoryId: clincherCategoryId,
              
              // Extra Questions (up to 7)
              extraQuestion1: record['Extra Question 1'] ? String(record['Extra Question 1']) : null,
              extraQuestion2: record['Extra Question 2'] ? String(record['Extra Question 2']) : null,
              extraQuestion3: record['Extra Question 3'] ? String(record['Extra Question 3']) : null,
              extraQuestion4: record['Extra Question 4'] ? String(record['Extra Question 4']) : null,
              extraQuestion5: record['Extra Question 5'] ? String(record['Extra Question 5']) : null,
              extraQuestion6: record['Extra Question 6'] ? String(record['Extra Question 6']) : null,
              extraQuestion7: record['Extra Question 7'] ? String(record['Extra Question 7']) : null,
              
              // Extra Answers (up to 7)
              extraAnswer1: record['Extra Answer 1'] ? String(record['Extra Answer 1']) : null,
              extraAnswer2: record['Extra Answer 2'] ? String(record['Extra Answer 2']) : null,
              extraAnswer3: record['Extra Answer 3'] ? String(record['Extra Answer 3']) : null,
              extraAnswer4: record['Extra Answer 4'] ? String(record['Extra Answer 4']) : null,
              extraAnswer5: record['Extra Answer 5'] ? String(record['Extra Answer 5']) : null,
              extraAnswer6: record['Extra Answer 6'] ? String(record['Extra Answer 6']) : null,
              extraAnswer7: record['Extra Answer 7'] ? String(record['Extra Answer 7']) : null,
              
              createdById: session.user.id
            });
            savedCount++;
            break;
          }

          // ========== MAIN MOCK CBT ==========
          case 'main-mock-cbt': {
            let mainMockCBTCategoryId = null;
            let timeLimit = null;
            
            if (record['Mock Name'] || record['Quiz Name']) {
              const categoryName = String(record['Mock Name'] || record['Quiz Name'] || '').trim();
              
              // Parse time limit if provided (in seconds)
              if (record['Time Limit (seconds)'] && record['Time Limit (seconds)'] !== '') {
                timeLimit = parseInt(String(record['Time Limit (seconds)']));
                if (isNaN(timeLimit)) timeLimit = null;
              }
              
              // Check if category already exists
              const existingCategory = await db
                .select()
                .from(academyCategory)
                .where(eq(academyCategory.name, categoryName))
                .limit(1);
              
              if (existingCategory.length > 0) {
                mainMockCBTCategoryId = existingCategory[0].id;
                // Update time limit if provided (only if different)
                if (timeLimit !== null && existingCategory[0].timeLimit !== timeLimit) {
                  await db
                    .update(academyCategory)
                    .set({ timeLimit })
                    .where(eq(academyCategory.id, existingCategory[0].id));
                }
              } else {
                // Create new category with time limit
                const [category] = await db
                  .insert(academyCategory)
                  .values({
                    name: categoryName,
                    type: 'main-mock-cbt',
                    timeLimit: timeLimit,
                    createdById: session.user.id
                  })
                  .returning();
                
                if (category) mainMockCBTCategoryId = category.id;
              }
            }

            await db.insert(mainMockCBT).values({
              quizName: String(record['Mock Name'] || record['Quiz Name'] || ''),
              questionId: String(record['Question ID'] || ''),
              question: String(record.Question || ''),
              figureUrl: record['Figure URL'] ? String(record['Figure URL']) : null,
              explanation: String(record.Explanation || ''),
              answer: String(record.Answer || ''),
              isCorrect: String(record['Is Correct']).toLowerCase() === 'true' || String(record['Is Correct']) === '1',
              categoryId: mainMockCBTCategoryId,
              createdById: session.user.id
            });
            savedCount++;
            break;
          }

          // ========== MAIN MOCK OSCE ==========
          case 'main-mock-osce': {
            let mainMockOSCECategoryId = null;
            let timeLimit = null;
            
            // Get or create category from MockOsce Name
            if (record['MockOsce Name']) {
              const categoryName = String(record['MockOsce Name'] || '').trim();
              
              // Parse time limit if provided (in seconds)
              if (record['Time Limit (seconds)'] && record['Time Limit (seconds)'] !== '') {
                timeLimit = parseInt(String(record['Time Limit (seconds)']));
                if (isNaN(timeLimit)) timeLimit = null;
              }
              
              const existingCategory = await db
                .select()
                .from(academyCategory)
                .where(eq(academyCategory.name, categoryName))
                .limit(1);
              
              if (existingCategory.length > 0) {
                mainMockOSCECategoryId = existingCategory[0].id;
                // Update time limit if provided
                if (timeLimit !== null && existingCategory[0].timeLimit !== timeLimit) {
                  await db
                    .update(academyCategory)
                    .set({ timeLimit })
                    .where(eq(academyCategory.id, existingCategory[0].id));
                }
              } else {
                // Create new category with time limit
                const [category] = await db
                  .insert(academyCategory)
                  .values({
                    name: categoryName,
                    type: 'main-mock-osce',
                    timeLimit: timeLimit,
                    createdById: session.user.id
                  })
                  .returning();
                
                if (category) mainMockOSCECategoryId = category.id;
              }
            }

            // Insert Main Mock OSCE question
            await db.insert(mainMockOSCE).values({
              osceName: String(record['MockOsce Name'] || '').trim(),
              questionId: String(record['MockOsce Slug'] || '').trim(),
              question: String(record['question'] || record['Question'] || '').trim(),
              figureUrl: record['Figure URL'] ? String(record['Figure URL']).trim() : null,
              explanation: record['image_question'] ? String(record['image_question']).trim() : '',
              answer: record['correct_answers'] ? String(record['correct_answers']).trim() : '',
              isCorrect: true,
              categoryId: mainMockOSCECategoryId,
              createdById: session.user.id
            });
            savedCount++;
            break;
          }

          // ========== MINI MOCK CBT ==========
          case 'mini-mock-cbt': {
            let miniMockCBTCategoryId = null;
            let timeLimit = null;
            
            // Get or create category from CBT Name
            if (record['CBT Name']) {
              const categoryName = String(record['CBT Name'] || '').trim();
              
              // Parse time limit if provided (in seconds)
              if (record['Time Limit (seconds)'] && record['Time Limit (seconds)'] !== '') {
                timeLimit = parseInt(String(record['Time Limit (seconds)']));
                if (isNaN(timeLimit)) timeLimit = null;
              }
              
              const existingCategory = await db
                .select()
                .from(academyCategory)
                .where(eq(academyCategory.name, categoryName))
                .limit(1);
              
              if (existingCategory.length > 0) {
                miniMockCBTCategoryId = existingCategory[0].id;
                // Update time limit if provided
                if (timeLimit !== null && existingCategory[0].timeLimit !== timeLimit) {
                  await db
                    .update(academyCategory)
                    .set({ timeLimit })
                    .where(eq(academyCategory.id, existingCategory[0].id));
                }
              } else {
                // Create new category with time limit
                const [category] = await db
                  .insert(academyCategory)
                  .values({
                    name: categoryName,
                    type: 'mini-mock-cbt',
                    timeLimit: timeLimit,
                    createdById: session.user.id
                  })
                  .returning();
                
                if (category) miniMockCBTCategoryId = category.id;
              }
            }

            // Parse isCorrect boolean
            const isCorrect = String(record['Is Correct'] || '').toLowerCase() === 'true' || 
                              String(record['Is Correct'] || '') === '1';

            await db.insert(miniMockCBT).values({
              quizName: String(record['CBT Name'] || '').trim(),
              questionId: String(record['Question ID'] || '').trim(),
              question: String(record['Question'] || '').trim(),
              figureUrl: record['Figure URL'] ? String(record['Figure URL']).trim() : null,
              explanation: String(record['Explanation (Raw HTML)'] || record['Explanation'] || '').trim(),
              answer: String(record['Answer'] || '').trim(),
              isCorrect: isCorrect,
              categoryId: miniMockCBTCategoryId,
              createdById: session.user.id
            });
            savedCount++;
            break;
          }

          // ========== MINI MOCK OSCE ==========
          case 'mini-mock-osce': {
            let miniMockOSCECategoryId = null;
            let timeLimit = null;
            
            // Get or create category from OSCE Name
            if (record['OSCE Name']) {
              const categoryName = String(record['OSCE Name'] || '').trim();
              
              // Parse time limit if provided (in seconds)
              if (record['Time Limit (seconds)'] && record['Time Limit (seconds)'] !== '') {
                timeLimit = parseInt(String(record['Time Limit (seconds)']));
                if (isNaN(timeLimit)) timeLimit = null;
              }
              
              const existingCategory = await db
                .select()
                .from(academyCategory)
                .where(eq(academyCategory.name, categoryName))
                .limit(1);
              
              if (existingCategory.length > 0) {
                miniMockOSCECategoryId = existingCategory[0].id;
                // Update time limit if provided
                if (timeLimit !== null && existingCategory[0].timeLimit !== timeLimit) {
                  await db
                    .update(academyCategory)
                    .set({ timeLimit })
                    .where(eq(academyCategory.id, existingCategory[0].id));
                }
              } else {
                // Create new category with time limit
                const [category] = await db
                  .insert(academyCategory)
                  .values({
                    name: categoryName,
                    type: 'mini-mock-osce',
                    timeLimit: timeLimit,
                    createdById: session.user.id
                  })
                  .returning();
                
                if (category) miniMockOSCECategoryId = category.id;
              }
            }

            await db.insert(miniMockOSCE).values({
              osceName: String(record['OSCE Name'] || '').trim(),
              questionId: String(record['Question ID'] || '').trim(),
              question: String(record['Question'] || '').trim(),
              figureUrl: record['Figure URL'] ? String(record['Figure URL']).trim() : null,
              correctAnswers: String(record['Correct Answers (Raw HTML)'] || record['Correct Answers'] || '').trim(),
              categoryId: miniMockOSCECategoryId,
              createdById: session.user.id
            });
            savedCount++;
            break;
          }

          // ========== QBLOCK ==========
          case 'qblock': {
            let qblockCategoryId = null;
            
            // Get or create category from Quiz Name
            if (record['Quiz Name']) {
              const categoryName = String(record['Quiz Name'] || '').trim();
              const existingCategory = await db
                .select()
                .from(academyCategory)
                .where(eq(academyCategory.name, categoryName))
                .limit(1);
              
              if (existingCategory.length > 0) {
                qblockCategoryId = existingCategory[0].id;
              } else {
                const [category] = await db
                  .insert(academyCategory)
                  .values({
                    name: categoryName,
                    type: 'qblock',
                    createdById: session.user.id
                  })
                  .returning();
                
                if (category) qblockCategoryId = category.id;
              }
            }

            // Parse the answers - remove the prefix (A:, B:, C:, D:) if present
            const cleanAnswer = (answer: string): string => {
              return String(answer || '')
                .replace(/^[A-D][:\s)]*\s*/i, '')
                .trim();
            };

            const answer1 = cleanAnswer(record['Answer 1']);
            const answer2 = cleanAnswer(record['Answer 2']);
            const answer3 = cleanAnswer(record['Answer 3']);
            const answer4 = cleanAnswer(record['Answer 4']);

            // Get correct answer and determine which option it matches
            const correctAnswerText = String(record['Correct Answer'] || '').trim();
            
            // Create array of answers with their text and index (1-based)
            const answerOptions = [
              { text: answer1, index: 1 },
              { text: answer2, index: 2 },
              { text: answer3, index: 3 },
              { text: answer4, index: 4 }
            ];

            // Clean the correct answer text
            const cleanCorrectAnswer = cleanAnswer(correctAnswerText);
            
            // Find which answer index matches the correct answer text
            let correctAnswerNum = 1; // default to first option
            
            // First check if it's a letter (A, B, C, D)
            if (correctAnswerText.match(/^[A-D]$/i)) {
              const letter = correctAnswerText.toUpperCase();
              correctAnswerNum = letter === 'A' ? 1 : letter === 'B' ? 2 : letter === 'C' ? 3 : 4;
            } 
            // Then check if it's a number (1,2,3,4)
            else if (correctAnswerText.match(/^[1-4]$/)) {
              correctAnswerNum = parseInt(correctAnswerText);
            }
            // Otherwise try to match by text content
            else {
              const matchingAnswer = answerOptions.find(opt => 
                opt.text.toLowerCase().includes(cleanCorrectAnswer.toLowerCase()) ||
                cleanCorrectAnswer.toLowerCase().includes(opt.text.toLowerCase())
              );
              
              if (matchingAnswer) {
                correctAnswerNum = matchingAnswer.index;
              }
            }

            await db.insert(qblock).values({
              question: String(record.question || record.Question || '').trim(),
              quizName: String(record['Quiz Name'] || '').trim(),
              answer1,
              answer2,
              answer3,
              answer4,
              correctAnswer: correctAnswerNum,
              categoryId: qblockCategoryId,
              createdById: session.user.id
            });
            savedCount++;
            break;
          }

          case 'qtopic': {
            // Parse answers
            const answer1 = String(record['Answer 1'] || '');
            const answer2 = String(record['Answer 2'] || '');
            const answer3 = String(record['Answer 3'] || '');
            const answer4 = String(record['Answer 4'] || '');
            const answer5 = record['Answer 5'] ? String(record['Answer 5']) : null;

            // Get correct answer text and clean it up
            const correctAnswerText = String(record['Correct Answer'] || '')
              .trim()
              .replace(/[<>]/g, '')
              .replace(/\s+/g, ' ')
              .trim();

            // Create array of answers with their text and index
            const answerOptions = [
              { text: answer1, index: 1 },
              { text: answer2, index: 2 },
              { text: answer3, index: 3 },
              { text: answer4, index: 4 },
              ...(answer5 ? [{ text: answer5, index: 5 }] : [])
            ];

            // Find matching answer
            const matchingAnswer = answerOptions.find(opt => 
              opt.text.trim().toLowerCase() === correctAnswerText.toLowerCase()
            );

            if (!matchingAnswer) {
              console.error(`Could not match correct answer for question: ${record.Question?.substring(0, 100)}`);
              throw new Error(`Cannot match correct answer to any option`);
            }

            await db.insert(qtopic).values({
              category: String(record.Category || 'General'),
              topic: String(record.Topic || 'General'),
              question: String(record.Question || ''),
              explanation: record.Explanation ? String(record.Explanation) : null,
              figureUrl: record['Figure URL'] ? String(record['Figure URL']) : null,
              answer1,
              answer2,
              answer3,
              answer4,
              answer5,
              correctAnswer: matchingAnswer.index,
              createdById: session.user.id
            });
            savedCount++;
            break;
          }

          case 'games': {
            // Group records by game title
            const gamesMap = new Map();
            
            for (const record of records) {
              const gameTitle = record['Game Title']?.trim();
              const gameSlug = record['Game Slug']?.trim() || gameTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              
              if (!gameTitle) {
                errors.push(`Skipping record with missing Game Title`);
                continue;
              }

              if (!gamesMap.has(gameTitle)) {
                gamesMap.set(gameTitle, {
                  title: gameTitle,
                  slug: gameSlug,
                  questions: []
                });
              }

              // Parse time limit (can be empty)
              let timeLimit = null;
              if (record['Time (seconds)'] && record['Time (seconds)'] !== '') {
                timeLimit = parseInt(record['Time (seconds)']);
                if (isNaN(timeLimit)) timeLimit = null;
              }

              gamesMap.get(gameTitle).questions.push({
                question: record.Question || '',
                answer: record['Answer (HTML)'] || '',
                timeLimit: timeLimit,
                figureUrl: record['Figure URL'] || null,
                seen: record.Seen?.toLowerCase() === 'true' || record.Seen === '1' || false,
                seenBy: record['Seen By'] || null,
                order: gamesMap.get(gameTitle).questions.length
              });
            }

            // Save to database
            for (const [_, gameData] of gamesMap) {
              try {
                // Check if game already exists
                const existingGame = await db
                  .select()
                  .from(game)
                  .where(eq(game.slug, gameData.slug))
                  .limit(1);

                let gameId;

                if (existingGame.length > 0) {
                  gameId = existingGame[0].id;
                  // Update existing game
                  await db
                    .update(game)
                    .set({
                      title: gameData.title,
                      totalQuestions: gameData.questions.length,
                      updatedAt: new Date()
                    })
                    .where(eq(game.id, gameId));
                } else {
                  // Create new game
                  const [newGame] = await db
                    .insert(game)
                    .values({
                      title: gameData.title,
                      slug: gameData.slug,
                      type: 'quiz',
                      totalQuestions: gameData.questions.length,
                      createdById: session.user.id
                    })
                    .returning();
                  
                  gameId = newGame.id;
                }

                // Delete existing questions and insert new ones
                await db
                  .delete(gameQuestion)
                  .where(eq(gameQuestion.gameId, gameId));

                for (const q of gameData.questions) {
                  await db.insert(gameQuestion).values({
                    gameId,
                    question: q.question,
                    answer: q.answer,
                    timeLimit: q.timeLimit,
                    figureUrl: q.figureUrl,
                    seen: q.seen,
                    seenBy: q.seenBy,
                    order: q.order
                  });
                }

                savedCount += gameData.questions.length;
              } catch (error) {
                errors.push(`Failed to save game ${gameData.title}: ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            }
            break;
          }

          case 'quiz': {
            // Determine quiz type from boolean flags
            let quizType = 'mcq'; // default
            const isDental = String(record['Is Dental'] || '').toLowerCase() === 'true' || record['Is Dental'] === '1';
            const isImage = String(record['Is Image'] || '').toLowerCase() === 'true' || record['Is Image'] === '1';
            
            if (isDental) {
              quizType = 'dental';
            } else if (isImage) {
              quizType = 'picture_test';
            }

            // Get or create quiz category
            let quizCategoryId = null;
            const categoryName = String(record.Category || 'General').trim();
            
            if (categoryName) {
              // Find existing category with matching name AND type
              const existingCategory = await db
                .select()
                .from(quizCategory)
                .where(
                  and(
                    eq(quizCategory.name, categoryName),
                    eq(quizCategory.type, quizType)
                  )
                )
                .limit(1);
              
              if (existingCategory.length > 0) {
                quizCategoryId = existingCategory[0].id;
              } else {
                // Create new category
                const [category] = await db
                  .insert(quizCategory)
                  .values({
                    name: categoryName,
                    type: quizType,
                    createdById: session.user.id
                  })
                  .returning();
                
                if (category) quizCategoryId = category.id;
              }
            }

            // Parse answers
            const answer1 = String(record['Answer 1'] || '').trim();
            const answer2 = String(record['Answer 2'] || '').trim();
            const answer3 = String(record['Answer 3'] || '').trim();
            const answer4 = String(record['Answer 4'] || '').trim();

            // Get correct answer text from CSV
            const correctAnswerText = String(record['Correct Answer'] || '').trim();

            // Find which answer index matches the correct answer text
            const answers = [answer1, answer2, answer3, answer4];
            
            // Find the index of the matching answer text
            const matchingIndex = answers.findIndex(answer => 
              answer.toLowerCase() === correctAnswerText.toLowerCase()
            );
            
            const correctAnswerNum = matchingIndex !== -1 ? matchingIndex : 0;

            await db.insert(quizQuestion).values({
              content: String(record.content || record.Content || ''),
              categoryId: quizCategoryId,
              answer1,
              answer2,
              answer3,
              answer4,
              correctAnswer: correctAnswerNum,
              figureUrl: record['Figure URL'] ? String(record['Figure URL']) : null,
              explanation: record.Explanation ? String(record.Explanation) : null,
              createdById: session.user.id
            });
            savedCount++;
            break;
          }

          default:
            errors.push(`Invalid upload type: ${type}`);
        }
      } catch (recordError) {
        errors.push(`Error processing record: ${recordError instanceof Error ? recordError.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: savedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully uploaded ${savedCount} items${errors.length > 0 ? ` with ${errors.length} errors` : ''}` 
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      error: 'Upload failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// DELETE method
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json({ error: 'Missing type or id' }, { status: 400 });
    }

    let deleted = false;
    
    switch (type) {
      case 'main-mock-cbt':
        await db.delete(mainMockCBT).where(eq(mainMockCBT.id, id));
        deleted = true;
        break;
      case 'main-mock-osce':
        await db.delete(mainMockOSCE).where(eq(mainMockOSCE.id, id));
        deleted = true;
        break;
      case 'mini-mock-cbt':
        await db.delete(miniMockCBT).where(eq(miniMockCBT.id, id));
        deleted = true;
        break;
      case 'mini-mock-osce':
        await db.delete(miniMockOSCE).where(eq(miniMockOSCE.id, id));
        deleted = true;
        break;
      case 'qblock':
        await db.delete(qblock).where(eq(qblock.id, id));
        deleted = true;
        break;
      case 'clincher':
        await db.delete(clincher).where(eq(clincher.id, id));
        deleted = true;
        break;
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    if (deleted) {
      return NextResponse.json({ success: true, message: 'Item deleted successfully' });
    } else {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}