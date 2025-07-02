import { configDotenv } from 'dotenv'
import mongoose from 'mongoose'
import User from './models/User'
import Workspace from './models/workspace.model'

configDotenv()

async function syncModelIndexes(model, name) {
  try {
    console.log(`Syncing indexes for:${name}`)
    const result = await model.syncIndexes()
    console.log(`✅ Index sync complete for ${name}. Dropped indexes:`, result)
  } catch (error) {
    console.error(`❌ Failed to sync indexes for ${name}`, err)
  }
}

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })

    console.log('✅ Connected to MongoDB')

    await syncModelIndexes(User, 'User')
    await syncModelIndexes(Workspace, 'Workspace')

    // Add other models here if needed:
    // await syncModelIndexes(Post, 'Post');
    // await syncModelIndexes(Comment, 'Comment');

    await mongoose.disconnect()
    console.log('🔌 Disconnected from MongoDB')
  } catch (err) {
    console.error('❌ Failed to complete index sync', err)
    process.exit(1)
  }
}

main()
