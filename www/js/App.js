function App() {
  if (!(this instanceof App)) return new App();
  var self = this;

  self.css = new Css;
  self.io = io(window.location.host + '/chat');

  self.io.on('connect', function() {
  });

  self.io.on('self', function(mySelf) {
    if (mySelf === false) return;

    var $self = $('.friends .self');
    $self.find('.name').addClass('class class-' + mySelf.job).text(mySelf.name);
    $self.find('.level').text('Lv.' + mySelf.level);
  });

  self.io.on('logo', function(guildId, logo) {
    self.css.setGuildLogo(guildId, logo);
  });

  self.io.on('chatSettings', function(settings) {
    if (!(settings.colors && settings.tabs)) return;

    for (var name in settings.colors) {
      var id = $channelIds[name];
      if (id == null) {
        console.warn('unknown channel name:', name);
        continue;
      }
      self.css.setChannelColor(id, settings.colors[name]);
    }

    var chats = $('#chats');
    if (chats.children().length == 0) {
      var panel = new Panel();

      settings.tabs.forEach(function(tab) {
        var channels = tab.channels.map(function(name) {
          return $channelIds[name] || -1;
        });
        panel.addTab($i18n[tab.name] || tab.name, channels);
      });

      chats.append(
        $make('div', 'axis vertical').append(
          $make('div', 'axis horizontal').append(
            panel.pane
          )
        )
      );
    }
  });

  self.io.on('guild', function(guild) {
    if (guild === false) return;

    var $guild = $('.guild');

    // set id
    var oldId = $guild.data('id');
    if (oldId) $guild.removeClass('guild-' + oldId);
    $guild.data('id', guild.id).addClass('guild-' + guild.id);

    // set nameplate
    $guild.find('.guild-rank').empty().append(
      $make('span').text(guild.myRank),
      $text(' of')
    );
    $guild.find('.guild-name').text(guild.name);

    // set motd
    $guild.find('.motd').text(guild.motd);

    // build members
    var members = [];
    for (var id in guild.members) {
      var member = guild.members[id];
      var status = (member.status == 2) ? 'offline' : 'online';
      var location = self.getLocation(member.location1, member.location2, member.location3);
      members.push(
        $make('tr', status).attr('id', 'guild-member-' + id).data('name', member.name).append(
          $make('td', 'name').text(member.name),
          $make('td', 'location').text(location[location.length - 1]).attr('title', location.join(' - '))
        )
      );
    }
    members.sort(function(a, b) {
      return a.data('name').localeCompare(b.data('name'));
    });
    $guild.find('.player-list tbody').empty().append(members);
  });

  self.io.on('sUpdateGuildMember', function(event) {
    var $member = $(document.getElementById('guild-member-' + event.playerID));
    if ($member.length === 0) {
      console.error('guild member ' + event.playerID + ' not found');
      return;
    }

    // update name
    if ($member.data('name') != event.name) {
      // TODO re-sort member on name change
    }

    // update status
    var status = (event.status === 0) ? 'online' : 'offline';
    if (!$member.hasClass(status)) {
      $member.removeClass('online offline').addClass(status);
    }

    // update location
    var location = self.getLocation(event.location1, event.location2, event.location3);
    $member.find('.location').text(location[location.length - 1]).attr('title', location.join(' - '));
  });

  self.io.on('friends', function(friends) {
    var $friends = $('.friends');
    var $list = $friends.find('.player-list');

    // set note
    $friends.find('.motd').text(friends.note);

    // make groups
    var groups = {};
    $list.find('tbody').remove();
    for (var id in friends.groups) {
      groups[id] =
        $make('tbody').data('group', id).append(
          $make('tr').append(
            $make('td', 'group-name').attr('colspan', 3).append(
              $make('h2').text(friends.groups[id]),
              $make('small').append(
                $text('('),
                $make('span', 'online-count').text('0'),
                $text('/'),
                $make('span', 'total-count').text('0'),
                $text(')')
              )
            )
          )
        );
    }

    // make members
    var members = {};
    for (var id in friends.friends) {
      var member = friends.friends[id];
      var group = member.group;
      var status = (member.status === 0) ? 'online' : 'offline';
      var location = self.getLocation(member.location1, member.location2, member.location3);
      if (!members[group]) members[group] = [];
      members[group].push(
        $make('tr', status).attr('id', 'friend-' + id).data('name', member.name).append(
          $make('td', 'status'),
          $make('td', 'name').text(member.name),
          $make('td', 'location').text(location[location.length - 1]).attr('title', location.join(' - '))
        )
      );
    }

    // tally, sort, and add to group
    for (var gid in members) {
      var group = groups[gid];
      if (!group) {
        console.error('group ' + gid + ' not found');
        continue;
      }

      var memberlist = members[gid];
      var online = $(memberlist).filter(function() { return $(this).hasClass('online'); }).length;
      memberlist.sort(function(a, b) {
        return a.data('name').localeCompare(b.data('name'));
      });

      // TODO
      group.find('.group-name .online-count').text(online);
      group.find('.group-name .total-count').text(memberlist.length);
      group.append(memberlist);
    }

    // append
    var grouplist = Object.keys(groups);
    grouplist.sort(function(a, b) { return (+a) < (+b); });
    $list.append(grouplist.map(function(gid) { return groups[gid]; }));
  });

  self.io.on('sChat', function(data) {
    for (var i = 0, len = Panel.list.length; i < len; i++) {
      Panel.list[i].addLine(data);
    }
  });
}

App.prototype.getLocation = function(loc1, loc2, loc3) {
  var world = $zones[loc1];
  if (world) {
    var guard = world[loc2];
    if (guard) {
      var section = guard[loc3];
      if (section) {
        return section;
      }
    }
  }
  return ['UNK-' + [loc1, loc2, loc3].join(',')];
};

App.prototype.escapeHtml = function escapeHtml(text) {
  return (
    text
      .replace(/"/g, '&quot;')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  );
};

App.prototype.filterLine = function filterLine(line) {
  var out = [];
  $(line).each(function() {
    switch (this.nodeName.toLowerCase()) {
      case '#text':
        out.push(this);
        break;
      case 'font':
        var $this = $(this);
        var color = $this.attr('color');
        if (color) {
          out.push($make('span').css('color', color).append(filterLine(this.childNodes)));
        } else {
          out.push.apply(out, filterLine(this.childNodes));
        }
        break;
      case 'a':
        // TODO
        out.push($make('a').append(filterLine(this.childNodes)));
        break;
      default:
        console.warn('unknown "' + this.nodeName + '" node');
    }
  });
  return out;
};

App.prototype.load = function($) {
  $('.workspace').append(
    $make('div', 'axis horizontal').append(
      $make('div', 'pane-container').attr('id', 'lists').css('flex-grow', '1'),
      $make('div', 'draggable').flexDraggable(),
      $make('div', 'pane-container').attr('id', 'chats').css('flex-grow', '3')
    )
  );

  $('#lists').append(
    $make('div', 'axis vertical').append(
      $make('div', 'panel friends').append(
        $make('h1').text('Friends'),
        $make('div', 'self').append(
          $make('div', 'name'),
          $make('div', 'level'),
          $make('blockquote', 'motd')
        ),
        $make('table', 'player-list').append(
          $make('thead').append(
            $make('tr').append(
              $make('th', 'status'),
              $make('th', 'name').text('Name'),
              $make('th', 'location').text('Location')
            )
          )
        )
      ),
      $make('div', 'draggable').flexDraggable(),
      $make('div', 'panel').append(
        $make('div', 'panel guild').append(
          $make('h1').text('Guild'),
          $make('div', 'guild-plate').append(
            $make('img', 'guild-emblem'),
            $make('div', 'guild-details').append(
              $make('div', 'guild-rank'),
              $make('div', 'guild-name')
            )
          ),
          $make('h2').text('Message of the Day'),
          $make('blockquote', 'motd'),
          $make('h2').text('Members'),
          $make('table', 'player-list').append(
            $make('thead').append(
              $make('tr').append(
                $make('th', 'name').text('Name'),
                $make('th', 'location').text('Location')
              )
            ),
            $make('tbody')
          )
        )
      )
    )
  );
};
