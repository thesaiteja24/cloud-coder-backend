import passport from 'passport'
import { Strategy as GitHubStrategy } from 'passport-github2'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as LocalStrategy } from 'passport-local'
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt'
import User from '../models/User.js'
import { configDotenv } from 'dotenv'

configDotenv()

passport.use(
  new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email })
        if (!user || !user.password) {
          return done(null, false, { message: 'Invalid credentials' })
        }
        const isMatch = await user.comparePassword(password)
        if (!isMatch) {
          return done(null, false, { message: 'Invalid credentials' })
        }
        return done(null, user)
      } catch (err) {
        return done(err)
      }
    }
  )
)

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ githubId: profile.id })
        if (!user) {
          user = new User({
            githubId: profile.id,
            username: profile.username || `github_${profile.id}`,
            name: profile.displayName || profile.username,
            email: profile.emails?.[0]?.value || '',
            profilePic:
              profile.photos?.[0]?.value || process.env.DEFAULT_PROFILE_PIC,
          })
          await user.save()
        }
        return done(null, user)
      } catch (err) {
        return done(err)
      }
    }
  )
)

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id })
        if (!user) {
          user = new User({
            googleId: profile.id,
            username:
              profile.emails?.[0]?.value.split('@')[0] ||
              `google_${profile.id}`,
            name: profile.displayName,
            email: profile.emails?.[0]?.value || '',
            profilePic:
              profile.photos?.[0]?.value || process.env.DEFAULT_PROFILE_PIC,
          })
          await user.save()
        }
        return done(null, user)
      } catch (err) {
        return done(err)
      }
    }
  )
)

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_ACCESS_SECRET,
    },
    async (jwtPayload, done) => {
      try {
        const user = await User.findById(jwtPayload.id)
        if (!user) {
          return done(null, false)
        }
        return done(null, user)
      } catch (err) {
        return done(err)
      }
    }
  )
)

passport.serializeUser((user, done) => done(null, user.id))
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id)
    done(null, user)
  } catch (err) {
    done(err)
  }
})
