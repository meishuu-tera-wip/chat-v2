function Modal() {
  var self = this;

  this.modal = $('.modal').empty();

  this.modal.append(
    $make('div', 'modal-header').append(
      $make('h4').text('Create Chat Tab'),
      $make('button', 'close').html('&times;')
    ),
    $make('div', 'modal-body').append(
      $make('form').append(
        $make('div', 'row').append(
          $make('label').text('Tab Name').append(
            $make('input').attr('type', 'text')
          )
        )
      )
    ),
    $make('div', 'modal-footer').append(
      $make('button', 'btn btn-default').text('Cancel'),
      $make('button', 'btn btn-primary').text('Create')
    )
  );

  this.modal.on('click', function(e) {
    e.stopPropagation();
  }).parent().on('click', self.close.bind(self));
  this.modal.find('.close').on('click', self.close.bind(self));

  var $form = this.modal.find('form');
  $channelGroups.forEach(function(group) {
    $make('div', 'channel-group').text(group.name).appendTo($form);
    group.channels.forEach(function(channel) {
      var id = 'form-channel-' + channel;
      $form.append(
        $make('div', 'group-item').append(
          $make('div', 'checkbox').append(
            $make('input').attr({ type: 'checkbox', id: id }),
            $make('label').attr('for', id)
          ),
          $make('label', 'channel-' + channel).attr('for', id).text($channels[channel].name)
        )
      );
    });
  });

  $form.find('.checkbox input').on('change', function() {
    $(this).parent().parent().toggleClass('checked', this.checked);
  });

  $form.find('label').on({
    mouseenter: function() {
      $(document.getElementById($(this).attr('for'))).siblings('label').addClass('hover');
    },
    mouseleave: function() {
      $(document.getElementById($(this).attr('for'))).siblings('label').removeClass('hover');
    },
  });

  $('.modal-container').css({ display: 'flex', opacity: 0 }).animate({ opacity: 1 });
  $('form .row input').focus();
}

Modal.prototype.close = function() {
  var self = this;
  $('.modal-container').off('click', this.close).fadeOut(function() {
    self.modal.empty();
  });
};
