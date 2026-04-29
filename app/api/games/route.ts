import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { game, gameQuestion } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

// GET all games or a specific game
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const id = searchParams.get('id');

    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes

    if (slug) {
      // Get specific game by slug with questions
      const games = await db
        .select()
        .from(game)
        .where(and(eq(game.slug, slug), eq(game.status, 'active')))
        .limit(1);

      if (games.length === 0) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 });
      }

      const questions = await db
        .select()
        .from(gameQuestion)
        .where(eq(gameQuestion.gameId, games[0].id))
        .orderBy(gameQuestion.order);

      return NextResponse.json({
        ...games[0],
        questions
      });
    } 
    else if (id) {
      // Get specific game by ID with questions
      const games = await db
        .select()
        .from(game)
        .where(eq(game.id, id))
        .limit(1);

      if (games.length === 0) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 });
      }

      const questions = await db
        .select()
        .from(gameQuestion)
        .where(eq(gameQuestion.gameId, id))
        .orderBy(gameQuestion.order);

      return NextResponse.json({
        ...games[0],
        questions
      });
    }
    else {
      // Get all games with question counts
      const games = await db
        .select({
          id: game.id,
          title: game.title,
          slug: game.slug,
          type: game.type,
          totalQuestions: game.totalQuestions,
          totalPlays: game.totalPlays,
          timeLimit: game.timeLimit,
          createdAt: game.createdAt
        })
        .from(game)
        .where(eq(game.status, 'active'))
        .orderBy(desc(game.createdAt));

      return NextResponse.json(games);
    }
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
  }
}