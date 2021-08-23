import cluster from 'cluster'
import { cpus } from 'os'
const numCPUs = cpus().length

// import SendMessage from '@geckos.io/common/lib/sendMessage.js'

const FORKS = 32 // Math.round(numCPUs / 2)
const TOTAL_CONNECTIONS = 128
const FPS = 1000 / 60

const url = 'http://localhost:9208'

if (cluster.isMaster) {
  for (let i = 0; i < FORKS; i++) {
    console.log('fork nr. ', i + 1)
    cluster.fork()
  }
} else {
  const _pkg0 = await import('node-fetch')
  const fetch = _pkg0.default

  const _pkg1 = await import('node-datachannel')
  const nodeDataChannel = _pkg1.default

  const toFixed = n => {
    return parseFloat(n.toFixed(2))
  }

  const main = () => {
    let dataChannel

    const connect = async () => {
      const host = `${url}/.wrtc/v2`

      let userData = {}
      let remotePeerConnection

      try {
        const res = await fetch(`${host}/connections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })

        const json = await res.json()

        userData = json.userData

        remotePeerConnection = json
      } catch (error) {
        console.error(error.message)
        return { error }
      }

      const { id, localDescription } = remotePeerConnection
      const { sdp, type } = localDescription

      // const configuration = {
      //   // @ts-ignore
      //   sdpSemantics: 'unified-plan'
      // }

      let localPeerConnection = new nodeDataChannel.PeerConnection('Peer2', {
        iceServers: []
      })

      localPeerConnection.onLocalDescription(async (sdp, type) => {
        // console.log('localPeerConnection SDP:', sdp, ' Type:', type)
        // peer1.setRemoteDescription(sdp, type)

        await fetch(`${host}/connections/${id}/remote-description`, {
          method: 'POST',
          body: JSON.stringify({ sdp, type }),
          headers: {
            'Content-Type': 'application/json'
          }
        })
      })

      localPeerConnection.onLocalCandidate((candidate, mid) => {
        // console.log('localPeerConnection Candidate:', candidate)
        // console.log('localPeerConnection Mid:', mid)
        // peer1.addRemoteCandidate(candidate, mid)
      })

      localPeerConnection.setRemoteDescription(sdp, type)
      // await localPeerConnection.setRemoteDescription(localDescription)
      // localPeerConnection.addEventListener('datachannel', onDataChannel, {
      //   once: true
      // })

      // fetch additional candidates
      const fetchAdditionalCandidates = async () => {
        const res = await fetch(
          `${host}/connections/${id}/additional-candidates`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          }
        )
        if (res.ok) {
          const candidates = await res.json()
          // eslint-disable-next-line no-undef
          candidates.forEach(c => {
            // eslint-disable-line no-undef
            // console.log(c)
            // console.log(typeof c.candidate, c.candidate)
            // console.log(typeof c.sdpMid, c.sdpMid)
            localPeerConnection.addRemoteCandidate(c.candidate, c.sdpMid)
          })
        }
      }

      setTimeout(() => {
        fetchAdditionalCandidates()
      }, 1000)

      // await localPeerConnection.setLocalDescription(updatedAnswer)

      const waitForDataChannel = () => {
        return new Promise(resolve => {
          localPeerConnection.onDataChannel(dc => {
            // console.log('localPeerConnection Got DataChannel: ', dc.getLabel())
            dataChannel = dc
            dataChannel.binaryType = 'arraybuffer'
            // dc2 = dc;
            // dc2.onMessage((msg) => {
            //     console.log('localPeerConnection Received Msg:', msg);
            // });
            // dc2.sendMessage("Hello From Peer2");
            resolve()
          })
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

        dataChannel.sendMessageBinary(Buffer.from(buffer))
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
