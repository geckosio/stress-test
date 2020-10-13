const cluster = require('cluster')
const numCPUs = require('os').cpus().length

const FORKS = Math.round(numCPUs / 2)
const TOTAL_CONNECTIONS = 24
const FPS = 1000 / 60

const url = 'http://localhost:9208'

if (cluster.isMaster) {
  for (let i = 0; i < FORKS; i++) {
    console.log('fork nr. ', i + 1)
    cluster.fork()
  }
} else {
  const fetch = require('node-fetch')
  const { RTCPeerConnection, RTCSessionDescription } = require('wrtc')

  const toFixed = n => {
    return parseFloat(n.toFixed(2))
  }

  const main = () => {
    let dataChannel

    const onDataChannel = ev => {
      const { channel } = ev
      dataChannel = channel

      dataChannel.binaryType = 'arraybuffer'

      dataChannel.onmessage = ev => {
        // console.log('message', ev)
      }
    }

    const connect = async () => {
      const host = `${url}/.wrtc/v1`

      let userData = {}

      try {
        const res = await fetch(`${host}/connections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })

        const json = await res.json()

        userData = json.userData

        this.remotePeerConnection = json
      } catch (error) {
        console.error(error.message)
        return { error }
      }

      const { id, localDescription } = this.remotePeerConnection

      const configuration = {
        // @ts-ignore
        sdpSemantics: 'unified-plan'
      }

      const localPeerConnection = new RTCPeerConnection(configuration)

      await localPeerConnection.setRemoteDescription(localDescription)
      localPeerConnection.addEventListener('datachannel', onDataChannel, {
        once: true
      })

      const originalAnswer = await localPeerConnection.createAnswer()
      const updatedAnswer = new RTCSessionDescription({
        type: 'answer',
        sdp: originalAnswer.sdp
      })

      await localPeerConnection.setLocalDescription(updatedAnswer)

      await fetch(`${host}/connections/${id}/remote-description`, {
        method: 'POST',
        body: JSON.stringify(localPeerConnection.localDescription),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const waitForDataChannel = () => {
        return new Promise(resolve => {
          localPeerConnection.addEventListener(
            'datachannel',
            () => {
              resolve()
            },
            { once: true }
          )
        })
      }

      if (!dataChannel) await waitForDataChannel()

      let player = {
        id: Math.random().toString(36).substr(2, 9),
        color: Math.random() * 0xffffff,
        x: toFixed(Math.random() * 800),
        y: toFixed(Math.random() * 600),
        velocity: {
          x: toFixed((Math.random() * 2 - 1) * 2),
          y: toFixed((Math.random() * 2 - 1) * 2)
        }
      }

      setInterval(() => {
        if (player.x >= 800) player.velocity.x = -Math.abs(player.velocity.x)
        if (player.x <= 0) player.velocity.x = Math.abs(player.velocity.x)

        if (player.y >= 600) player.velocity.y = -Math.abs(player.velocity.y)
        if (player.y <= 0) player.velocity.y = Math.abs(player.velocity.y)

        player.x += player.velocity.x
        player.y += player.velocity.y

        player.x = toFixed(player.x)
        player.y = toFixed(player.y)

        const buffer = new ArrayBuffer(8) // 2 * 32 bit = 64 bit = 8 bytes
        const view = new DataView(buffer)
        view.setInt32(0, player.x * 100)
        view.setInt32(4, player.y * 100)

        dataChannel.send(buffer)
      }, FPS)
    }

    setTimeout(() => {
      connect()
    }, 1000)
  }

  for (let i = 0; i < TOTAL_CONNECTIONS / FORKS; i++) {
    setTimeout(() => {
      main()
    }, Math.random() * 1_000)
  }
}
