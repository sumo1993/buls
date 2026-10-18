import { NextRequest, NextResponse } from 'next/server'

const flagUrls: Record<string, string> = {
  'bomi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Flag_of_Bomi_County.svg/400px-Flag_of_Bomi_County.svg.png',
  'bong': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Flag_of_Bong_County.svg/400px-Flag_of_Bong_County.svg.png',
  'gbarpolu': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Flag_of_Gbarpolu_County.svg/400px-Flag_of_Gbarpolu_County.svg.png',
  'grand-bassa': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Flag_of_Grand_Bassa_County.svg/400px-Flag_of_Grand_Bassa_County.svg.png',
  'grand-cape-mount': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Flag_of_Grand_Cape_Mount_County.svg/400px-Flag_of_Grand_Cape_Mount_County.svg.png',
  'grand-gedeh': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Flag_of_Grand_Gedeh_County.svg/400px-Flag_of_Grand_Gedeh_County.svg.png',
  'grand-kru': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Flag_of_Grand_Kru_County.svg/400px-Flag_of_Grand_Kru_County.svg.png',
  'lofa': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Flag_of_Lofa_County.svg/400px-Flag_of_Lofa_County.svg.png',
  'margibi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Flag_of_Margibi_County.svg/400px-Flag_of_Margibi_County.svg.png',
  'maryland': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Flag_of_Maryland_County.svg/400px-Flag_of_Maryland_County.svg.png',
  'montserrado': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Flag_of_Montserrado_County.svg/400px-Flag_of_Montserrado_County.svg.png',
  'nimba': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Flag_of_Nimba_County.svg/400px-Flag_of_Nimba_County.svg.png',
  'river-cess': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Flag_of_River_Cess_County.svg/400px-Flag_of_River_Cess_County.svg.png',
  'river-gee': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Flag_of_River_Gee_County.svg/400px-Flag_of_River_Gee_County.svg.png',
  'sinoe': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Flag_of_Sinoe_County.svg/400px-Flag_of_Sinoe_County.svg.png',
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const name = searchParams.get('name')

  if (!name || !flagUrls[name]) {
    return new NextResponse('Flag not found', { status: 404 })
  }

  try {
    const response = await fetch(flagUrls[name], {
      headers: {
        'User-Agent': 'BULS-Management/1.0'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch flag')
    }

    const imageBuffer = await response.arrayBuffer()

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error(`Error fetching flag for ${name}:`, error)
    return new NextResponse('Error fetching flag', { status: 500 })
  }
}
