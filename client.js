const fetch = require('node-fetch');
const { RTCPeerConnection, RTCSessionDescription } = require('wrtc')

const url = 'http://localhost:9208'

const toFixed = (n) => {
  return parseFloat(n.toFixed(2))
}

const main = () => {

  let dataChannel
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


    setInterval(() => {

      if (player.x > 800 || player.x < 0) player.velocity.x = -player.velocity.x
      if (player.y > 600 || player.y < 0) player.velocity.y = -player.velocity.y

      player.x += player.velocity.x
      player.y += player.velocity.y

      player.x = toFixed(player.x)
      player.y = toFixed(player.y)


      sendMessage({ player })
    }, 1000 / 30)



  }


  setTimeout(() => {
    connect()
  }, 1000)
}

const TOTAL_CONNECTIONS = 4

for (let i = 0; i < TOTAL_CONNECTIONS; i++) {
  main()
}