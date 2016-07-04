(function($) {
  $('.destroy').on('click', function(e) {
    console.log('delete called');
    e.preventDefault();
    if (confirm('Are you sure?')) {
       var   element = $(this),
             form = $('<form></form>');
       form
          .attr({
             method: 'POST',
             action: element.attr('href')
          })
          .hide()
          .append( '<input type="hidden" />' )
          .find('input')
          .attr({
             'name': '_method',
             'value': 'DELETE'
          })
          .end()
          .submit();
    }
  });
})(jQuery);
