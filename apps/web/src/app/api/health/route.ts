import { NextResponse } from 'next/server';
import { prisma } from '@subtitle-burner/database';
import { detectDeploymentMode } from '@subtitle-burner/queue';

export async function GET() {
  let dbOk = false;
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    dbOk = true;
  } catch {
    // DB not connected
  }

  return NextResponse.json({
    status: 'ok',
    mode: detectDeploymentMode(),
    db: dbOk,
    timestamp: new Date().toISOString(),
  });
}
