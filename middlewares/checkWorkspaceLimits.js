import Workspace from '../models/workspace.model.js'
import { logDebug } from '../utils/logger.js'

export const checkWorkspaceLimits = async (req, res, next) => {
  const userId = req?.userId
  const workspaceCount = await Workspace.countDocuments({ userId })
  if (workspaceCount >= 5) {
    return res.status(429).json({
      status: 'error',
      message:
        'Maximum limit of 5 workspaces reached. Please delete the an existing workspace or upgrade your plan',
    })
  }
  next()
}
