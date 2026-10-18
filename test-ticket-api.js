// Test the ticket API directly
const https = require('https')

async function testTicketAPI() {
  const ticketId = '3c6574d9-63f1-473f-b32f-e2b2bbc46c97'
  const url = `http://localhost:3000/api/tickets/${ticketId}/guests`
  
  console.log(`🌐 Testing API: ${url}`)
  
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        console.log(`📊 Status: ${res.statusCode} ${res.statusMessage}`)
        console.log(`📦 Response: ${data}`)
        resolve({ status: res.statusCode, data })
      })
    })
    
    req.on('error', (error) => {
      console.error('❌ Request error:', error.message)
      // Try HTTP instead of HTTPS
      console.log('Trying HTTP instead...')
      const http = require('http')
      
      const req2 = http.get(url.replace('https:', 'http:'), (res) => {
        let data = ''
        
        res.on('data', (chunk) => {
          data += chunk
        })
        
        res.on('end', () => {
          console.log(`📊 Status: ${res.statusCode} ${res.statusMessage}`)
          console.log(`📦 Response: ${data}`)
          resolve({ status: res.statusCode, data })
        })
      })
      
      req2.on('error', (error2) => {
        console.error('❌ HTTP request error:', error2.message)
        reject(error2)
      })
    })
  })
}

testTicketAPI().catch(console.error)