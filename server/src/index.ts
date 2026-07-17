// Local development entry point.
// The Express app is defined in ./app.ts so it can be reused by the Vercel
// serverless function (api/[[catchall]].ts) without starting a long-running server.
import 'dotenv/config'
import { app, prisma } from './app.js'

const PORT = process.env.PORT || 4000

async function start() {
  try {
    await prisma.$connect()
    console.log('Connected to database')
    app.listen(PORT, () => {
      console.log(`Mira ERP API server running on http://localhost:${PORT}`)
    })
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

start()
