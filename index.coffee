web = require 'web'
scaleform = require 'scaleform'

bypass = (str) ->
  # ./
  str = str.replace /^<FONT>\.(\.*)\//, '<FONT>$1/'

  # consecutive "w"s
  str = str.replace /w-w/gi, (match) -> match.split('-').join('-&#8206;') # w-w
  str = str.replace /w{3,}/gi, (match) -> match.split('').join('&#8206;') # www

  # .com
  str = str.replace /\.(?=com)/gi, '.&#8206;'

module.exports = class Chat2
  constructor: (dispatch) ->
    chatSettings =
      tabs: []
      colors: {}

    mySelf =
      name: ''
      job: 0
      level: 0
    myGuild = false
    myFriends =
      note: ''
      groups: {}
      friends: {}
      broadcast: false

    #
    #
    #
    www = web.load '/chat', __dirname + '/web'

    www.on 'chat', (channel, message) ->
      dispatch.toServer 'cChat', {channel, message}

    www.on 'whisper', (target, message) ->
      dispatch.toServer 'cWhisper', {target, message}

    #
    #
    #
    dispatch.hook 'sGetUserGuildLogo', (event) ->
      www.emit 'guildLogo', event.guildId, event.logo.toString 'base64'
      return

    #
    #
    #
    dispatch.hook 'sLogin', (event) ->
      mySelf =
        name: event.name
        job: (event.model - 10101) % 100
        level: event.level

      www.emit 'self', mySelf

      myGuild = false
      return

    #
    #
    #
    dispatch.hook 'sLoadClientAccountSetting', (event) ->
      res = scaleform.read 'ui-packet', event.data
      for item in res.data when item.name is 'S1ChatController'
        data = new Buffer scaleform.inflate item.data
        settings = scaleform.read 'class-S1ChatController', data

        chatSettings.tabs = []
        for tab in settings.tab
          chatSettings.tabs.push
            name: tab.name
            channels: ch.name for ch in tab.channels

        chatSettings.colors = {}
        for channel in settings.channel
          chatSettings.colors[channel.name] = [channel.r, channel.g, channel.b]

        www.emit 'chatSettings', chatSettings
        break

    #    +-------+
    # -> | cChat |
    #    +-------+
    # * get rid of space in `/em '` and `/em ,` with <FONT> spoof
    # * perform filter bypasses for all non-/em messages
    dispatch.hook 'cChat', (event) ->
      str = event.message

      if event.channel isnt 212
        str = bypass str
      else # /em
        # apostrophe or comma
        if str[0] in "',"
          str = '<FONT>' + mySelf.name + str + '</FONT>'

      # modify if changed
      if str isnt event.message
        event.message = str
        true

    #    +----------+
    # -> | cWhisper |
    #    +----------+
    # * custom badwords bypass alongside regular filter bypasses
    dispatch.hook 'cWhisper', (event) ->
      str = bypass event.message

      # modify if changed
      if str isnt event.message
        event.message = str
        true

    #    +-------+
    # <- | sChat |
    #    +-------+
    # * remove &#8206; (filter bypass nbsp) for 3d overhead text display
    # * show author of /em <FONT> spoofs that don't begin with their name
    # * log the message
    dispatch.hook 'sChat', (event) ->
      www.emit 'sChat', event

      str = event.message.replace /&\#(8206)?;/g, ''

      if event.channel is 212
        # hackery to find /em <FONT> spoofing
        i = str.indexOf '<FONT'
        if i < 0
          line = event.authorName + ' ' + str
        else
          str = str[i..]
          raw = str.replace /<\/?[^<>]*>/g, ''
          if 0 is raw.lastIndexOf event.authorName, 0
            line = str
          else
            line = '<FONT SIZE="14">[' + event.authorName + ']:</FONT> ' + str

      if str isnt event.message
        event.message = str
        true

    #    +----------+
    # <- | sWhisper |
    #    +----------+
    # * remove &#8206; (filter bypass nbsp) for 3d overhead text display
    # * `[<- From]` and `[To ->]` message formats
    # * log the message
    dispatch.hook 'sWhisper', (event) ->
      www.emit 'sWhisper', event, event.author is mySelf.name

      str = event.message.replace /&\#(8206)?;/g, ''

      if str isnt event.message
        event.message = str
        true

    #    +----------------+
    # <- | sGuildAnnounce |
    #    +----------------+
    dispatch.hook 'sGuildAnnounce', (event) ->
      console.log event.motd
      return

    #    +----------------+
    # <- | sSystemMessage |
    #    +----------------+
    # * handle some guild-related events
    # * log the message
    # * TODO handle more stuff
    dispatch.hook 'sSystemMessage', (event) ->
      return if event.message[0] isnt '@'

      args = event.message.split '\x0B'
      str = args.shift()
      params = {}
      while args.length > 0
        params[args.shift()] = args.shift()

      console.log str, params # TODO

      switch str
        # guild join
        when '@260'
          ;#gen 205, "#{params.Name} joined the guild."

        # guild quit
        when '@760'
          ;#gen 205, "#{params.UserName} left the guild."

        # guild login
        when '@1769', '@1770'
          line = params.UserName + ' logged in'
          if params.Comment?
            line += ': ' + params.Comment
          else
            line += '.'

          ;#gen 205, line

        # guild logout
        when '@1879'
          ;#gen 205, "#{params.UserName} logged out."

      return

    #
    #
    #
    dispatch.hook 'sGuildInfo', (event) ->
      if !myGuild
        myGuild =
          id: 0
          name: ''
          motd: ''
          myRank: ''
          ranks: {}
          members: {}
          broadcast: true

      myGuild.id = event.id
      myGuild.name = event.name
      myGuild.motd = event.motd
      myGuild.myRank = event.myRank
      myGuild.ranks = {}
      for rank in event.ranks
        myGuild.ranks[rank.id] = rank.name

      return

    #
    #
    #
    dispatch.hook 'sGuildMemberList', (event) ->
      return if !myGuild

      if event.first
        myGuild.members = {}

      for member in event.members
        myGuild.members[member.playerID] = member

      if event.last and myGuild.broadcast
        www.emit 'guild', myGuild
        myGuild.broadcast = false

      return

    #
    #
    #
    dispatch.hook 'sUpdateGuildMember', (event) ->
      member = myGuild.members[event.playerID]
      if member? then member[k] = v for k, v of event
      www.emit 'sUpdateGuildMember', event
      return

    #
    #
    #
    dispatch.hook 'sFriendGroupList', (event) ->
      myFriends.broadcast = true
      myFriends.groups = {}
      for group in event.groups
        myFriends.groups[group.index] = group.name
      return

    #
    #
    #
    dispatch.hook 'sFriendList', (event) ->
      myFriends.note = event.personalNote
      myFriends.friends = {}
      for friend in event.friends
        myFriends.friends[friend.id] = friend
      return

    #
    #
    #
    dispatch.hook 'sUpdateFriendInfo', (event) ->
      send = false
      updates = {}
      for friend in event.friends
        old = myFriends.friends[friend.id]
        for k in ['level', 'race', 'class', 'gender', 'status', 'location1', 'location2', 'location3', 'name']
          if old[k] isnt friend[k]
            old[k] = v for k, v of friend
            updates[friend.id] = friend
            send = true
            break

      if myFriends.broadcast
        www.emit 'friends', myFriends
        myFriends.broadcast = false
      else if send
        www.emit 'friendsUpdate', updates

      return
