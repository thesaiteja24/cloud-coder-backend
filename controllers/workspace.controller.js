import Docker from 'dockerode'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { logInfo, logError, logDebug } from '../utils/logger.js'
import { emitToUser } from '../services/websocket.js'
import Workspace from '../models/workspace.model.js'
import { v4 as uuidv4 } from 'uuid'

const docker = new Docker()
const s3 = new S3Client({
  region: process.env.AWS_S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
  },
})

const getAvailablePort = async () => {
  const usedPorts = (await docker.listContainers())
    .map(c => c.Ports[0]?.PublicPort)
    .filter(Boolean)
  let port = 8081
  while (usedPorts.includes(port) || port === 8443) port++
  return port
}

export const startWorkspace = async (req, res) => {
  const userId = req.user._id
  try {
    // Check if the specific image exists
    const images = await docker.listImages()
    const desiredImage = 'codercom/code-server:4.101.2-39'
    const imageExists = images.some(
      image => image.RepoTags && image.RepoTags.includes(desiredImage)
    )

    // Pull the image if it doesn't exist
    if (!imageExists) {
      emitToUser(userId, 'progress', { message: 'Pulling image ...' })
      logInfo(
        'Image not found, pulling codercom/code-server:4.101.2-39',
        { userId },
        req
      )
      await new Promise((resolve, reject) => {
        docker.pull(desiredImage, (err, stream) => {
          if (err) return reject(err)
          docker.modem.followProgress(
            stream,
            (err, output) => {
              if (err) return reject(err)
              emitToUser(userId, 'progress', {
                message: 'Image pulled successfully',
              })
              logInfo('Image pulled successfully', { userId }, req)
              resolve(output)
            },
            progress => {
              // Live progress update
              const message = progress.status || 'Pulling...'
              const detail = progress.progressDetail || {}
              const progressUpdate = {
                message: message,
                current: detail.current || 0,
                total: detail.total || 0,
              }
              emitToUser(userId, 'progressUpdate', progressUpdate) // Custom event for live updates
            }
          )
        })
      })
    }

    // Generate a unquie workspace id (using time as id)
    const workspaceId = uuidv4()
    // generate a container name using userID and containerId
    const containerName = `cloud-coder-${userId}-${workspaceId}`

    const containers = await docker.listContainers({ all: true })
    const existingContainer = containers.find(c =>
      c.Names.includes(`/cloud-coder-${userId}-${workspaceId}`)
    )
    if (existingContainer) {
      const workspaceUrl = `http://localhost:${existingContainer.Ports[0].PublicPort}`
      emitToUser(userId, 'success', {
        message: 'Workspace already running',
        workspaceUrl: `http://localhost:${existingContainer.Ports[0].PublicPort}`,
      })
      logInfo('Workspace already running', { userId }, req)

      await Workspace.findOneAndUpdate(
        { userId, _id: workspaceId },
        { workspaceUrl: workspaceUrl },
        { upsert: true, new: true }
      )

      return res.json({
        status: 'success',
        message: 'Workspace already running',
        data: {
          workspaceUrl: `http://localhost:${existingContainer.Ports[0].PublicPort}`,
        },
      })
    }

    // Allocate a port
    const port = await getAvailablePort()

    // Create user-specific S3 directory if it doesn't exist
    const bucket = process.env.AWS_S3_BUCKET
    // await s3.send(
    //   new PutObjectCommand({
    //     Bucket: bucket,
    //     Key: `users/${userId}/workspaces/${workspaceId}/`,
    //   })
    // )

    // Create volume for the workspace
    await docker.createVolume({ Name: `${userId}-${workspaceId}-data` })

    // Start a new code-server container
    emitToUser(userId, 'progress', { message: 'Starting container...' })
    const container = await docker.createContainer({
      Image: desiredImage, // Use the specific version
      name: containerName,
      Env: [
        `PASSWORD=${process.env.CODE_SERVER_PASSWORD}`,
        `DEFAULT_WORKSPACE=/home/coder/project`,
      ],
      HostConfig: {
        Binds: [`${userId}-${workspaceId}-data:/home/coder/project`],
        PortBindings: { '8080/tcp': [{ HostPort: `${port}` }] },
      },
    })

    await container.start()
    const workspaceUrl = `http://localhost:${port}`
    emitToUser(userId, 'success', {
      message: 'Workspace started',
      workspaceUrl,
    })
    logInfo('Workspace started', { userId, workspaceId, port }, req)

    // Save new workspace to database
    await Workspace.create({
      _id: workspaceId,
      userId,
      workspaceUrl: workspaceUrl,
      status: 'running',
    })

    res.json({
      status: 'success',
      message: 'Workspace started',
      data: { workspaceUrl: workspaceUrl },
    })
  } catch (err) {
    emitToUser(userId, 'error', {
      message: 'Failed to start workspace',
      error: err.message,
    })
    logError('Failed to start workspace', err, { userId }, req)
    res
      .status(500)
      .json({ status: 'error', message: 'Failed to start workspace' })
  }
}
