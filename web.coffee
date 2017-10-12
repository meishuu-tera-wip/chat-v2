guildlogo = require 'guildlogo'

self = false

guild = false

friends =
  note: ''
  groups: {}
  friends: {}

settings = {}

logos = {}

module.exports = (ipc, web, io) ->
  web.use web.static __dirname + '/www'

  ipc.on 'self', (mySelf) ->
    self = mySelf
    io.emit 'self', self

  ipc.on 'chatSettings', (chatSettings) ->
    settings = chatSettings
    io.emit 'chatSettings', settings

  ipc.on 'guild', (myGuild) ->
    guild = myGuild
    io.emit 'guild', guild

  ipc.on 'friends', (myFriends) ->
    friends = myFriends
    io.emit 'friends', myFriends

  ipc.on 'guildLogo', (guildId, logo) ->
    logo = new Buffer logo, 'base64'
    guildlogo.convert logo, (err, res) ->
      if !err?
        logos[guildId] = 'data:image/png;base64,' + res.toString 'base64'
        io.emit 'logo', guildId, logos[guildId]

  ipc.on 'friendsUpdate', (updates) ->
    for id, friend of updates
      friends.friends[id][k] = v for k, v of friend
    io.emit 'friendsUpdate', updates

  ipc.on 'sChat', (event) ->
    io.emit 'sChat',
      author:
        id: event.authorID
        name: event.authorName
      channel: event.channel
      time: Date.now()
      message: event.message

  ipc.on 'sWhisper', (event, sent) ->
    io.emit 'sChat',
      author:
        id: event.player
        name: (if sent then event.recipient else event.author)
      sent: sent
      channel: 7
      time: Date.now()
      message: event.message

  ipc.on 'sUpdateGuildMember', (event) ->
    if member = guild.members[event.playerID]
      member[k] = v for k, v of event
    io.emit 'sUpdateGuildMember', event

  io.on 'connection', (socket) ->
    socket.emit 'self', self
    socket.emit 'chatSettings', settings
    socket.emit 'friends', friends
    socket.emit 'guild', guild
    for gid, logo of logos
      socket.emit 'logo', gid, logo

    socket.on 'chat', (channel, message) ->
      ipc.emit 'chat', channel, message

    socket.on 'whisper', (target, message) ->
      ipc.emit 'whisper', target, message
