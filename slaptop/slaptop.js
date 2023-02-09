//navbar

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


setupFlickr = function() {





  var flickerAPI = "http://api.flickr.com/services/feeds/photos_public.gne?jsoncallback=?";

$.getJSON(flickerAPI, {
id: "197155581@N04",
tags: "test, test2",
tagmode: "any",
format: "json"
})
.done(function (result, status, xhr) {

console.log("Connecting to Flickr: " + status);

const picsData = result.items;

console.log('Flickr pics: ');
console.log(picsData);


if (status == "success") {
  picsFolder(picsData)
}

}).fail(function (xhr, status, error) {
console.log("Result: " + status + " " + error + " " + xhr.status + " " + xhr.statusText);
$('.picsFolderContent').append('<span> oops. something seems to have gone wrong :/ </span>');
});


// loading 'pics' folder with sub-folders using photo tags

function picsFolder(picsData) {

picsTag = picsData.map(item => item.tags)
.filter((value, index, self) => self.indexOf(value) === index);

console.log("Picture Tags: " + picsTag);

for (let i = 0; i < picsTag.length; i++) {

const tag = picsTag[i];

tagData = picsData.filter(tagGroup => tagGroup.tags == picsTag[i]);

$('.picsFolderContent')
  .append('<div id="'
       + tag +
       '-folder" class="folder-icon"><div><img src="/slaptop/assets/icons/Folder.png"></div><span>'
       + tag +
       '</span></div>');

loadTagFolders(tagData, tag);

openTagFolder(tag);



}

}

function loadTagFolders(tagData, tag) {

var $tagsDialogs = $('<div></div>')
  .addClass("tagsFolderContent " + tag + "")
  .dialog({
      autoOpen: false,
      title: tag,
      resizable: false,
  });

$.each(tagData, function (i, pic) {





$("<div id="
+ pic.title +
" class=" + 'card-pic' + "><div><img id="
   + pic.title +
  "-src src=" + pic.media.m + "></div><span>"
   + pic.title +
   "</span></div>").appendTo("." + tag + "");
});
console.log(tagData);

}



openPicsFolder = function() {
$dialog.dialog('open');
}

function openTagFolder(tag) {
$("#" + tag + "-folder").on( 'click' , function() {
$("." + tag + "").dialog('open')
});
}

}
