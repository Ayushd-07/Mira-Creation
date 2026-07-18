// Type declarations for compiled server output
// This file provides type safety for the Vercel serverless function import
declare module '../server/dist/src/app.js' {
  import { Express } from 'express'
  const app: Express
  export default app
  export { app }
}