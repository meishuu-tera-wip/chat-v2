function Css() {
  $('head').append(document.createElement('style'));
  this.stylesheet = document.styleSheets[document.styleSheets.length - 1];

  this.channelColors = {};
  this.tabChannels = {};
  this.guildLogos = {};
};

Css.prototype.addRule = function(rule) {
  var index = this.stylesheet.insertRule(rule, 0);
  return this.stylesheet.cssRules.item(index).style;
};

Css.prototype.setChannelColor = function(channel, rgb) {
  var rule = this.channelColors[channel];
  var color = 'rgb(' + rgb.join(',') + ')';
  if (!rule) {
    this.channelColors[channel] = this.addRule('.channel-' + channel + ' { color: ' + color + '}');
  } else {
    rule.setProperty('color', color);
  }
};

Css.prototype.setTabChannels = function(tab, channels) {
  var self = this;

  var rules = this.tabChannels[tab];
  if (!rules) rules = this.tabChannels[tab] = {};

  for (var channel in rules) {
    if (channels.indexOf(channel) == -1) {
      rules[channel].setProperty('display', 'none');
    }
  }

  channels.forEach(function(channel) {
    if (!rules[channel]) {
      rules[channel] = self.addRule('.tab-' + tab + ' .line.channel-' + channel + ' { display: block; }');
    } else{
      rules[channel].setProperty('display', 'block');
    }
  });
};

Css.prototype.setGuildLogo = function(guild, logo) {
  var rule = this.guildLogos[guild];
  if (!rule) {
    this.guildLogos[guild] = this.addRule('.guild-' + guild + ' .guild-emblem { content: url("' + logo + '"); }');
  } else {
    rule.setProperty('content', 'url("' + logo + '")');
  }
};
