import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'

const userSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    username: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    password: { type: String },
    githubId: { type: String, unique: true, sparse: true },
    googleId: { type: String, unique: true, sparse: true },
    profilePic: {
      type: String,
      default: function () {
        return `https://api.dicebear.com/9.x/thumbs/svg?seed=${this.username}`
      },
    },
    refreshToken: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpiry: { type: Date },
  },
  { _id: false }
)

userSchema.pre('save', async function (next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 10)
  }
  next()
})

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

export default mongoose.model('User', userSchema)
