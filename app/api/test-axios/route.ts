import { NextResponse } from 'next/server'
import axios from 'axios'

export async function GET() {
  try {
    const url = 'https://jsvjdrnhvxlxzqhkijpj.supabase.co/rest/v1/users'
    const apikey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    console.log('Testing with axios...')
    console.log('URL:', url)
    console.log('Key length:', apikey.length)
    
    const response = await axios.get(url, {
      headers: {
        'apikey': apikey,
        'Authorization': `Bearer ${apikey}`
      },
      timeout: 10000
    })
    
    return NextResponse.json({
      success: true,
      message: 'Axios connection successful!',
      userCount: response.data.length,
      data: response.data
    })
    
  } catch (error: any) {
    console.error('Axios test failed:', error.message)
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      response: error.response?.data
    }, { status: 500 })
  }
}
