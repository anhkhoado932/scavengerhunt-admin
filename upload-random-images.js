// upload-random-images.js
import { config }  from 'dotenv'
config({ path: '.env.local' })    // loads your SUPABASE_URL & KEY

import fetch        from 'node-fetch'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE URL or KEY in .env.local')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const topics = [
  'nature','city','animals','food','technology',
  'architecture','travel','people','art','sports'
]

async function main() {
  for (let i = 0; i < 100; i++) {
    const topic = topics[i % topics.length]
    const seed  = i

    // <<< use Picsum to guarantee no 404 >>>
    const imageUrl = `https://picsum.photos/300/300?random=${seed}`

    try {
      const res = await fetch(imageUrl)
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)

      // read binary as ArrayBuffer so supabase-js will multipart it correctly
      const arrayBuffer = await res.arrayBuffer()
      const filePath    = `auto/${topic}-${seed}.jpg`

      const { error } = await supabase
        .storage
        .from('group-photos')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false
        })

      if (error) {
        console.error(`❌ Upload failed for ${filePath}:`, error.message)
      } else {
        console.log(`✅ Uploaded ${filePath}`)
      }
    } catch (err) {
      console.error(`❌ Error on ${topic}-${seed}:`, err)
    }
  }

  console.log('🏁 All done!')
}

main().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
