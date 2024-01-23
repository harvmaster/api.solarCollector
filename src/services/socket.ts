'use strict'

import crypto from 'crypto'
import { Server, Socket } from 'socket.io'
import { DefaultEventsMap } from 'socket.io/dist/typed-events'

type JoinMessage = ProviderJoinMessage | ConsumerJoinMessage

interface ProviderJoinMessage {
  clientType: 'provider',
  data: {
    channelId: string;
    password: string;
  }
}

interface ConsumerJoinMessage {
  clientType: 'consumer',
  data: {
    channelId: string;
    password: string;
  }
}

interface Channel {
  id: string;
  state: ChannelState;
  consumers: User[];
  provider: User;
}

interface ChannelState {
  solar?: number;
  battery?: number;
  consumption?: number;
}

interface User {
  id: string;
  client: any;
}

/**
 * WebSocket Library
 * @memberof Services
 */
type Client = Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>

class WebSocket {

  socket?: Server
  channels: Channel[] = []

  constructor () {
  }

  /**
   * Setup the Websocket server
   */
  async startServer (server) {
    // Setup Websockets
    this.socket = new Server(server, {
      cors: {
        origin: "*",
        methods: ['GET', 'POST']
      }
    })
    this.socket.on('connection', (client) => this._onConnection(client))
    console.log('started web socket')
  }

  /**
   * Triggered when a Websocket client sends and 'join' message
   * @param client The Websocket of the client
   * @param msg The message sent by the client
   * @private
   */
  async onJoin (client, msg: JoinMessage) {
    // Channel id is hash of channelId and password
    const channelId = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg.data.channelId + msg.data.password)).then(hash => {
      return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
    })

    const channel = this.channels.find((channel) => channel.id === channelId)

    // Create channel if they are a provider
    if (!channel) {
      if (msg.clientType !== 'provider') return client.emit('error', { error: 'ChannelId or Password incorrect' })  // only providers can create channels

      // create channel
      this.channels.push({
        id: channelId,
        state: {
          solar: 0,
          battery: 0,
          consumption: 0
        },
        consumers: [],
        provider: null
      })
    }

    // join channel - provider
    if (msg.clientType === 'provider') {
      channel.provider = {
        id: client.id,
        client
      }
      return client.emit('joined', { channelId })
    }
    
    // join channel - consumer
    if (msg.clientType === 'consumer') {

      // Dont let them join twice
      if (channel.consumers.find((consumer) => consumer.id === client.id)) {
        this.channels.find((channel) => channel.id === channelId).consumers = channel.consumers.filter((consumer) => consumer.id !== client.id)
      }

      channel.consumers.push({
        id: client.id,
        client
      })
      return client.emit('joined', { channelId })
    }
  }

  /**
   * Triggered when a Websocket client sends and 'update' message
   * @param client The Websocket of the client
   * @param msg The message sent by the client
   * @private
   */
  async onUpdate (client: Client, msg: ChannelState) {
    // is client a provider
    const channel = this.channels.find(channel => channel.provider.id === client.id)
    const user = channel.provider

    // Validate msg
    if (msg.solar && isNaN(msg.solar)) return client.emit('error', { error: 'Invalid solar value' })
    if (msg.battery && isNaN(msg.battery)) return client.emit('error', { error: 'Invalid battery value' })
    if (msg.consumption && isNaN(msg.consumption)) return client.emit('error', { error: 'Invalid consumption value' })

    // has extra fields?
    const validKeys = ['solar', 'battery', 'consumption']
    if (Object.keys(msg).some(key => !validKeys.includes(key))) return client.emit('error', { error: 'Invalid key' })

    // update state and send to consumers
    if (user) {
      channel.state = {...channel.state, ...msg}
      channel.consumers.forEach(consumer => consumer.client.emit('update', msg))
    }

    // save data in database

  }

  /**
   * Triggered when a Websocket client connects
   * @param ws The Websocket of the client
   * @private
   */
  async _onConnection (client: Client) {
    console.log('connection attempt')

    // Setup event listeners
    client.prependAny(console.log)
    client.on('update', (msg) => this.onUpdate(client, msg))
    client.on('join', (msg) => this.onJoin(client, msg))
  }
}

const webSocket = new WebSocket()

export default webSocket