import { NextResponse } from 'next/server';

// Initial release accepts manual wallet references only; no fake checkout API.
export async function POST() {
  return NextResponse.json(
    { error: 'Online checkout is not enabled. Submit a manual payment reference from your student dashboard.' },
    { status: 410 },
  );
}
