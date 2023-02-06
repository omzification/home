setupNav = function () {

    $(document).ready(function(){
        $(".nav-item").click(function(){
            $('.nav-item').not($(this)).removeClass('nav-item--open');
          $(this).toggleClass("nav-item--open");
          });
      });


  $(document).ready(function(){
    $("body").on('click', function (event) {
            $('.nav-item--open').removeClass('nav-item--open');
  
  });
  
  $('nav').on('click', function (event) {
    event.stopPropagation();
  });
  
  });
  

}
