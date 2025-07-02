import mongoose from 'mongoose'
import { v4 as uuidv4 } from 'uuid'

const workspaceSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    userId: { type: String, ref: 'User', required: true },
    workspaceUrl: { type: String, required: true },
    createdAt: { type: Date, default: Date.now() },
  },
  { _id: false }
)

workspaceSchema.index({ userId: 1 })

export default mongoose.model('Workspace', workspaceSchema)
