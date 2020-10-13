const geckos = require('@geckos.io/server').default
const { iceServers } = require('@geckos.io/server')

const FPS = 1000 / 40

const io = geckos({
  iceServers: process.env.NODE_ENV === 'production' ? iceServers : iceServers
})

io.listen()

let updates = []
let start = new Date().getTime()

setInterval(() => {
  const u = [...updates]
  updates = []

  const buffer = new ArrayBuffer(u.length * 8)
  const view = new DataView(buffer)

  for (let i = 0; i < u.length; i++) {
    view.setInt32(i * 8, u[i].x)
    view.setInt32(i * 8 + 4, u[i].y)
  }

  io.raw.emit(buffer)

  let end = new Date().getTime()

  const realFps = Math.round(FPS - (end - start))
  if (realFps < -2) console.log(realFps)

  start = end
}, FPS)

io.onConnection(channel => {
  channel.onRaw(buffer => {
    const view = new DataView(buffer)
    const x = +view.getInt32(0)
    const y = +view.getInt32(4)

    updates.push({ x, y })
  })
})
