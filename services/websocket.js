import { Server } from 'socket.io'

let io

export const initSocket = server => {
  io = new Server(server, { cors: { origin: '*' } })
  console.log('Socket.IO initialized')

  io.on('connection', socket => {
    console.log('A client connected')
    socket.on('message', data => {
      try {
        const parsedData = JSON.parse(data)
        if (parsedData.join) {
          const userId = parsedData.join
          socket.join(userId)
          console.log(`Client joined room for user ${userId}`)
        }
      } catch (e) {
        console.log('Failed to parse join message', e)
      }
    })
    socket.on('disconnect', () => {
      console.log('Client disconnected')
    })
  })
}

export const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(userId).emit(event, data)
  } else {
    console.log('Socket.IO not initialized')
  }
}
