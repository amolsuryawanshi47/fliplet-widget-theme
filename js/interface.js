Handlebars.registerHelper('setValue', function(node) {
  var values = node.data._parent._parent.root.instance.settings.values || {};
  return values[this.name] || this.default;
});

Fliplet.Widget.register('com.fliplet.theme', function () {
  var saveRequests = [];
  var $main = $('main');

  if (!Fliplet.Env.get('appId')) {
    throw new Error('appId is required');
  }

  $instances = $('[data-instances]');

  function tpl(name) {
    return Fliplet.Widget.Templates['templates.' + name];
  }

  function reloadPage() {
    Fliplet.Studio.emit('reload-page-preview');
  }

  function init() {
    return Fliplet.Themes.get().then(function (themes) {
      $instances.html('');

      themes.forEach(function (theme) {
        if (!theme.instances.length) {
          $instances.append(tpl('create')(theme));
          return;
        }

        theme.instances.forEach(function (instance) {
          $instances.append(tpl('instance')({
            instance: instance,
            theme: theme
          }));
        });
      });

      // bind plugins on inputs
      $instances.find('[data-type="color"]').each(function () {
        var picker = new jscolor(this, {
          hash: true
        });
      });

    });
  }

  $instances.on('click', '[data-create-instance]', function (event) {
    event.preventDefault();

    Fliplet.API.request({
      method: 'POST',
      url: 'v1/widget-instances?appId=' + Fliplet.Env.get('appId'),
      data: {
        widgetId: $(this).data('create-instance')
      }
    }).then(init);
  });

  $instances.on('click', '[data-delete-instance]', function (event) {
    event.preventDefault();

    Fliplet.API.request({
      method: 'DELETE',
      url: 'v1/widget-instances/' + $(this).closest('[data-instance-id]').data('instance-id'),
      data: {
        destroy: true
      }
    }).then(init).then(reloadPage);
  });

  $instances.on('submit', '[data-instance-id] form', function (event) {
    event.preventDefault();

    var $form = $(this);

    var instanceId = $form.closest('[data-instance-id]').data('instance-id');

    var data = $form.serializeArray().reduce(function(obj, item) {
      obj[item.name] = item.value;
      return obj;
    }, {});

    saveRequests.push(Fliplet.API.request({
      url: 'v1/widget-instances/' + instanceId,
      method: 'PUT',
      data: {
        values: data
      }
    }));
  });

  Fliplet.Widget.onSaveRequest(function () {
    saveRequests = [];
    $instances.find('[data-instance-id] form').submit();

    $main.addClass('saving');

    Promise.all(saveRequests).then(function () {
      $main.removeClass('saving');

      Fliplet.Widget.complete();
      reloadPage();
    }, function (err) {
      $main.removeClass('saving');

      var message = err.responseJSON.error && err.responseJSON.error.formatted;
      console.warn(err.responseJSON.error);
      alert(message);
    });
  });

  init();

  return {};
});