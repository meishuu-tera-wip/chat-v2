/***************
 * constructor *
 ***************/
function Panel() {
  var self = this;

  self.pane = $make('div', 'chat-pane');
  self.tabs = $make('ul', 'tab-bar');
  self.log = $make('div', 'log').attr('tabindex', 0);

  self.input = $make('div', 'input channel-0').data('channel', 0);
  self.input.append(
    $make('div', 'channel').text('Say (/s)'),
    $make('div', 'whisper channel-7'),
    $make('textarea').attr({ rows: 1, tabindex: -1 })
  );

  self.pane.append(
    self.tabs,
    $make('div', 'chat-view').append(
      self.log
    ),
    self.input
  );

  // bind events
  self.log.on('keydown', function(e) {
    switch (e.which) {
      case 13: // enter
        $(this).parent().siblings('.input').children('textarea').focus();
        e.preventDefault();
        break;
      case 37: // left
      case 38: // up
      case 39: // right
      case 40: // down
        if (e.ctrlKey && e.shiftKey) {
          self.split(e.which - 37);
          e.preventDefault();
        }
        break;
      default:
        //
    };
  });

  $('textarea', self.input).on({
    keydown: function(e) {
      switch (e.which) {
        case 9: // tab
          var tabs = self.tabs.children();
          if (tabs.length > 1) {
            var active = tabs.filter('.active');
            var next = active[e.shiftKey ? 'prev' : 'next']();
            if (next.length == 0) {
              next = tabs[e.shiftKey ? 'last' : 'first']();
            }
            next.click();
          }
          e.preventDefault();
          break;
        case 13: // enter
          var $this = $(this);
          var val = app.escapeHtml($this.val());
          if (val === '') {
            self.log.focus();
          } else {
            var channel = self.input.data('channel');
            if (channel == 7) {
              app.io.emit('whisper', self.input.data('target'), val);
            } else {
              app.io.emit('chat', channel, val);
            }
            $this.val('').trigger('input');
          }
          e.preventDefault();
          break;
        case 27: // escape
          self.log.focus();
          e.preventDefault();
          break;
        default:
          //console.log(e.which);
      }
    },
    input: function() {
      var $this = $(this);

      // channel swap
      var val = $this.val().replace(/\xa0$/, ' ');
      if (val[0] === '/') {
        var idx = val.indexOf(' ');
        if (idx !== -1) {
          var shortcut = val.slice(1, idx).toLowerCase();
          var message = val.slice(idx + 1);
          switch (shortcut) {
            case 'n':
              console.error('TODO handle /n'); // TODO
              break;
            case 'r':
              console.error('TODO handle /r'); // TODO
              break;
            case 'w':
              idx = message.indexOf(' ');
              if (idx !== -1) {
                self.setChannel(7);
                self.setWhisper(message.slice(0, idx));
                $this.val(message.slice(idx + 1));
              }
              break;
            default:
              var channel = $shortcuts[shortcut];
              if (channel != null) {
                self.setChannel(+channel);
                $this.val(message);
              }
          }
        }
      }

      // resize
      var diff = parseInt($this.css('paddingTop')) + parseInt($this.css('paddingBottom'));
      $this.height(0).height(this.scrollHeight - diff);
    },
  });

  Panel.list.push(self);
};

/**********
 * static *
 **********/
Panel.tabCount = 0;
Panel.list = [];

/***********
 * methods *
 ***********/
Panel.prototype.addTab = function(name, channels) {
  var self = this;
  var id = Panel.tabCount++;

  var tab =
    $make('li', 'tab')
      .data('tab-id', id)
      .append($make('div', 'title').text(name))
      .appendTo(self.tabs)
      .on('click', function(e) {
        if (!tab.hasClass('active')) {
          var active = self.tabs.children('.active').removeClass('active');
          self.pane.removeClass('tab-' + active.data('tab-id')).addClass('tab-' + id);
          $(this).addClass('active');
        }
        e.preventDefault();
      });

  app.css.setTabChannels(id, channels);

  if (self.tabs.children().length == 1) {
    tab.click();
  }

  return id;
};

Panel.prototype.addLine = function(data) {
  var line = $make('div', 'line channel-' + data.channel);
  var time = new Date(data.time);

  // make time element
  line.append(
    $make('time')
      .attr('datetime', time.toISOString())
      .text('[' + timeString(time, false) + ']')
  );

  // make author element (if necessary)
  var author;
  if (data.author) {
    line.addClass('author-' + data.author.id.high + '-' + data.author.id.low);
    author = $make('a', 'author').text(data.author.name);
  }

  // check message
  var message = $i18n[data.message] || data.message;
  var parse = app.filterLine($.parseHTML(message));

  // generate line
  var message = $make('span', 'message').append(parse).appendTo(line);
  switch (data.channel) {
    case 26: // emote
    case 212: // rp
      message.prepend(author, $text(' '));
      break;
    case 7: // whisper
      message.prepend($text(data.sent ? '[to ' : '[from '), author, $text(']: '));
      break;
    default:
      message.prepend($text('['), author, $text(']: '));
  }
  if (data.author) {
    var channel = $channels[data.channel];
    if (channel && channel.name) {
      $make('span', 'channel-name').text('[' + channel.name + ']').prependTo(message);
    }
  }

  // check if at bottom
  var scroll = (this.log.scrollTop() + this.log.innerHeight() > this.log.prop('scrollHeight') - 2);

  // append to log
  this.log.append(line);

  // autoscroll
  if (scroll) {
    this.log.scrollTop(this.log.prop('scrollHeight') - this.log.innerHeight());
  }
};

Panel.prototype.setChannel = function(channel) {
  var old = this.input.data('channel');

  if (old == 7) this.setWhisper('');

  this.input
    .removeClass('channel-' + old)
    .addClass('channel-' + channel)
    .data('channel', channel);

  var chan = $channels[channel];
  var text = chan.name;
  if (chan.shortcuts) text += ' (/' + chan.shortcuts[0] + ')';
  this.input.find('.channel').text(text);
};

Panel.prototype.setWhisper = function(target) {
  this.input.data('target', target);
  var whisper = this.input.find('.whisper');
  var textarea = this.input.find('textarea');
  if (target == '') {
    whisper.text('');
    textarea.css('padding-left', '');
  } else {
    whisper.text('to ' + target + ':');
    textarea.css('padding-left', whisper.outerWidth() + 'px');
  }
};

Panel.prototype.split = function(direction) { // direction = { 0: left, up, right, down }
  var panel = new Panel;
  var horizontal = !(direction & 1);
  var after = !!(direction >> 1);
  var type = (horizontal ? 'horizontal' : 'vertical');

  var parent = this.pane.parent();
  if (parent.hasClass('horizontal') != horizontal) {
    if (parent.children().length > 1) {
      parent = $make('div', 'axis ' + type).insertAfter(this.pane);
      this.pane.appendTo(parent);
    } else {
      parent.removeClass('horizontal vertical').addClass(type);
    }
  }

  var handle = $make('div', 'draggable').flexDraggable();
  if (after) {
    this.pane.after(handle, panel.pane);
  } else {
    this.pane.before(panel.pane, handle);
  }

  panel.log.focus();
};
