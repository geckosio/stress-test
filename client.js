const cluster = require('cluster')
const numCPUs = require('os').cpus().length

const FORKS = 1 //Math.round(numCPUs / 2)
const TOTAL_CONNECTIONS = 1
const FPS = 1000 / 30

const url = 'http://localhost:9208'

if (cluster.isMaster) {
  for (let i = 0; i < FORKS; i++) {
    console.log('fork nr. ', i + 1)
    cluster.fork()
  }
} else {
  const fetch = require('node-fetch')
  const nodeDataChannel = require('node-datachannel')

  const toFixed = n => {
    return parseFloat(n.toFixed(2))
  }

  const main = () => {
    let dataChannel

    // const onDataChannel = ev => {
    //   const { channel } = ev
    //   dataChannel = channel

    //   dataChannel.binaryType = 'arraybuffer'

    //   dataChannel.onmessage = ev => {
    //     // console.log('message', ev)
    //   }
    // }

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

      const localPeerConnection = new nodeDataChannel.PeerConnection('Peer2', {
        iceServers: []
      })

      localPeerConnection.onStateChange(state => {
        console.log('localPeerConnection State:', state)
      })

      localPeerConnection.onLocalDescription((sdp, type) => {
        fetch(`${host}/connections/${id}/remote-description`, {
          method: 'POST',
          body: JSON.stringify({ sdp, type }),
          headers: {
            'Content-Type': 'application/json'
          }
        })
      })

      localPeerConnection.setRemoteDescription(
        localDescription.sdp,
        localDescription.type
      )

      const res = await fetch(
        `${host}/connections/${id}/additional-candidates`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
      const candidates = await res.json()
      candidates.forEach(c => {
        localPeerConnection.addRemoteCandidate(c.candidate, c.sdpMid)
      })

      // await localPeerConnection.setRemoteDescription(localDescription)
      // localPeerConnection.addEventListener('datachannel', onDataChannel, {
      //   once: true
      // })

      // const originalAnswer = await localPeerConnection.createAnswer()
      // const updatedAnswer = new RTCSessionDescription({
      //   type: 'answer',
      //   sdp: originalAnswer.sdp
      // })

      // await localPeerConnection.setLocalDescription(updatedAnswer)

      dataChannel = localPeerConnection.createDataChannel('geckos.io')

      dataChannel.onMessage(msg => {
        console.log('Peer1 Received Msg:', msg)
      })

      const waitForDataChannel = () => {
        return new Promise(resolve => {
          dataChannel.onOpen(() => {
            resolve()
          })
        })
      }

      if (!dataChannel.isOpen()) await waitForDataChannel()

      console.log('isopen')

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

        if (dataChannel.isOpen()) {
          dataChannel.sendMessage('Hello From Peer2')
          dataChannel.sendMessageBinary(Buffer.from('Hello From Peer2'))
          dataChannel.sendMessageBinary(Buffer.alloc(4))
          dataChannel.sendMessage(
            '-' + JSON.stringify({ x: player.x * 100, y: player.y * 100 })
          )
          dataChannel.sendMessage(
            JSON.stringify({
              message: { x: player.x * 100, y: player.y * 100 }
            })
          )
        }
      }, FPS)
    }

    setTimeout(() => {
      connect()
    }, 1000)
  }

  for (let i = 0; i < TOTAL_CONNECTIONS / FORKS; i++) {
    setTimeout(() => {
      main()
    }, Math.random() * 1_000 + 2_000)
  }
}
