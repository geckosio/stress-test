const geckos = require('@geckos.io/server').default
const { iceServers } = require('@geckos.io/server')


const io = geckos({
  iceServers: process.env.NODE_ENV === 'production' ? iceServers : iceServers
})

io.listen()

setInterval(() => {
  console.log('total connection: ', io.connectionsManager.connections.size)
}, 5000)

let updates = []

setInterval(() => {

  const u = [...updates]
  updates = []




  const buffer = new ArrayBuffer(u.length * 8)
  const view = new DataView(buffer);

  //console.log(u)

  for (let i = 0; i < u.length; i++) {
    view.setInt32(i * 8, u[i].x)
    view.setInt32(i * 8 + 4, u[i].y)
  }

  // console.log(buffer.byteLength)

  io.raw.emit(buffer)

}, 1000 / 30);

io.onConnection(channel => {
  channel.onRaw(buffer => {

    const view = new DataView(buffer);
    const x = +view.getInt32(0)
    const y = +view.getInt32(4)

    updates.push({ x, y })
  })
})

