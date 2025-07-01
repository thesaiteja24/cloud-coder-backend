import Docker from 'dockerode'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { logInfo, logError, logDebug } from '../utils/logger.js'

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
  while (usedPorts.includes(port)) port++
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
      logInfo(
        'Image not found, pulling codercom/code-server:4.101.2-39',
        { userId },
        req
      )
      await new Promise((resolve, reject) => {
        docker.pull(desiredImage, (err, stream) => {
          if (err) return reject(err)
          docker.modem.followProgress(stream, (err, output) =>
            err ? reject(err) : resolve(output)
          )
        })
      })
      logInfo('Image pulled successfully', { userId }, req)
    }

    const containers = await docker.listContainers({ all: true })
    const existingContainer = containers.find(c =>
      c.Names.includes(`/code-server-${userId}`)
    )
    if (existingContainer) {
      logInfo('Workspace already running', { userId }, req)
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
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: `users/${userId}/`,
      })
    )

    // Start a new code-server container
    const container = await docker.createContainer({
      Image: desiredImage, // Use the specific version
      name: `code-server-${userId}`,
      Env: [
        `PASSWORD=${process.env.CODE_SERVER_PASSWORD}`,
        `DEFAULT_WORKSPACE=/home/coder/project`,
      ],
      HostConfig: {
        Binds: [`${userId}-data:/home/coder/project`],
        PortBindings: { '8080/tcp': [{ HostPort: `${port}` }] },
      },
    })

    await container.start()
    logInfo('Workspace started', { userId, port }, req)
    res.json({
      status: 'success',
      message: 'Workspace started',
      data: { workspaceUrl: `http://localhost:${port}` },
    })
  } catch (err) {
    logError('Failed to start workspace', err, { userId }, req)
    res
      .status(500)
      .json({ status: 'error', message: 'Failed to start workspace' })
  }
}
