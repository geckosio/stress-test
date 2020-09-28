const fetch = require('node-fetch');
const { RTCPeerConnection, RTCSessionDescription } = require('wrtc')

const url = 'http://localhost:9208'

const toFixed = (n) => {
  return parseFloat(n.toFixed(2))
}

const main = () => {

  let dataChannel


  const onDataChannel = (ev) => {
    const { channel } = ev
    dataChannel = channel

    dataChannel.binaryType = 'arraybuffer'

    dataChannel.onmessage = (ev) => {
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
    localPeerConnection.addEventListener('datachannel', onDataChannel, { once: true })

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


    const sendMessage = (update) => {
      dataChannel.send(JSON.stringify({ 'update': update }))
    }

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
      const view = new DataView(buffer);
      view.setInt32(0, player.x * 100);
      view.setInt32(4, player.y * 100);

      //console.log('client', player.x, player.y)

      dataChannel.send(buffer)

      //sendMessage({ player })
    }, 1000 / 30)



  }


  setTimeout(() => {
    connect()
  }, 1000)
}

const TOTAL_CONNECTIONS = 64

for (let i = 0; i < TOTAL_CONNECTIONS; i++) {
  setTimeout(() => {
    main()
  }, Math.random() * 10_000)
}