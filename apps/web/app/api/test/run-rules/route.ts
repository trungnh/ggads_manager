import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { evaluationQueue } from '@/lib/queue'; // I need to make sure this is exported correctly

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Add a one-time job to the queue
    await evaluationQueue.add('evaluate-all-rules', { 
      triggeredBy: session.user.id,
      manual: true 
    });

    return NextResponse.json({ 
      message: 'Job đã được thêm vào hàng đợi. Vui lòng kiểm tra log worker hoặc trang nhật ký Rule sau vài giây.' 
    });
  } catch (error: any) {
    console.error('[TEST_RUN_RULES] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
