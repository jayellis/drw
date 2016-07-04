(function($) {
  var lazyload = {
    init: function(config) {
      this.blocks = config.blocks;
    },
    
    loadImgUri: function() {
      if($self.data("background"))
          loadImgUri = $self.data("background");
      else
          loadImgUri  = $self.data(settings.data_attribute);

      $("<img />")
          .bind("load", function() {
              $self
                  .hide();
              if($self.data("background")){
                  $self.css('backgroundImage', 'url('+$self.data("background")+')');
              }else
                  $self.attr("src", $self.data(settings.data_attribute))

              $self[settings.effect](settings.effect_speed);

              self.loaded = true;

              /* Remove image from array so it is not looped next time. */
              var temp = $.grep(elements, function(element) {
                  return !element.loaded;
              });
              elements = $(temp);

              if (settings.load) {
                  var elements_left = elements.length;
                  settings.load.call(self, elements_left, settings);
              }
          })
          .attr("src", loadImgUri );
    }
  };

  lazyload.init({
    blocks: $('.block')
  });
})(jQuery);
