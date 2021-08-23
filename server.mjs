import geckos, { iceServers } from '@geckos.io/server'

const FPS = 1000 / 60

const io = geckos({
  iceServers: process.env.NODE_ENV === 'production' ? iceServers : iceServers
})

io.listen()

let updates = []
let start = new Date().getTime()

setInterval(() => {
  const u = [...updates]
  updates = []

  if (u.length > 0) {
    const buffer = new ArrayBuffer(u.length * 8)
    const view = new DataView(buffer)

    for (let i = 0; i < u.length; i++) {
      view.setInt32(i * 8, u[i].x)
      view.setInt32(i * 8 + 4, u[i].y)
    }

    io.raw.emit(buffer)

    let end = new Date().getTime()

    // const realFps = Math.round(FPS - (end - start))
    // if (realFps < -2) console.log(realFps)

    if (end - start > 64) console.log(end - start)
    console.log(end - start)

    start = end
  }
}, FPS)

function toArrayBuffer(buf) {
  var ab = new ArrayBuffer(buf.length)
  var view = new Uint8Array(ab)
  for (var i = 0; i < buf.length; ++i) {
    view[i] = buf[i]
  }
  return ab
}

io.onConnection(channel => {
  channel.onRaw(b => {
    const buffer = toArrayBuffer(b)
    const view = new DataView(buffer)
    const x = +view.getInt32(0)
    const y = +view.getInt32(4)

    updates.push({ x, y })
  })
})
