const geckos = require('@geckos.io/server').default
const { iceServers } = require('@geckos.io/server')


const io = geckos({
  iceServers: process.env.NODE_ENV === 'production' ? iceServers : iceServers
})

io.listen()

setInterval(() => {
  console.log('total connection: ', io.connectionsManager.connections.size)
}, 1000)

let updates = []

setInterval(() => {
  io.emit('updates', updates)
  updates = []
}, 1000 / 30);

io.onConnection(channel => {
  channel.on('update', data => {
    updates.push(data)
  })
})

