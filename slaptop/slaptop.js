
folder_pics = new Object();



function navBar_init() {

  $(".nav-item").on('click', function() {
    $('.nav-item').not($(this)).removeClass('nav-item--open');
    $(this).toggleClass("nav-item--open");
  });

  $("body").on('click', function (event) {
    $('.nav-item--open').removeClass('nav-item--open');

  $('nav').on('click', function (event) {
    event.stopPropagation();
  });

  });
}

function flickr_init() {
    var flickr = new Flickr('04ec818edf19dcf85b42097da1da9734');

    flickr.collections.getTree({
      user_id: '197155581@N04',
      collection_id: '197123442-72157721508680147',
    }).then(function (slaptop_pics) {

      var slaptop_collection = slaptop_pics.body.collections.collection[0];
      const collection = {"albums": slaptop_collection.set, "description": slaptop_collection.description, "id": slaptop_collection.id, "title": "pics"};

      getPics(collection);
    }).catch(function (slaptop_err) {
      console.error('uh oh :/', slaptop_err);
  
    });
  
  function getPics(collection) {

  for (let i = 0; i < collection.albums.length; i++) {

    collection.albums[i].pics = new Array();

    const albumID = collection.albums[i].id;
    const albumTitle = collection.albums[i].title;

    var flickr = new Flickr('04ec818edf19dcf85b42097da1da9734');

    flickr.photosets.getPhotos({
        user_id: '197155581@N04',
        photoset_id: albumID,
    }).then(function (pics) {

      for (let index = 0; index < pics.body.photoset.photo.length; index++) {

        const picID = pics.body.photoset.photo[index].id;

          flickr.photos.getInfo({
              photo_id: picID
          }).then(function (pics_info) {

            const pic_info = pics_info.body.photo;
            const pic = {"id": pic_info.id, "date_taken": pic_info.dates.taken, "album": albumTitle, "title": pic_info.title._content, 
                "url": 'https://live.staticflickr.com/'
                + pic_info.server + '/' 
                + pic_info.id + '_' 
                + pic_info.secret + '.jpg',
                "geo": {"country": pic_info.location.country._content, "region": pic_info.location.region._content,"county": pic_info.location.county._content,"locality": pic_info.location.locality._content,"neighbourhood": pic_info.location.neighbourhood._content}};
                
            flickr.photos.getExif({
                photo_id: picID
            }).then(function (pic_exif) {

              const exif = pic_exif.body.photo.exif;
              const tags = ['LensMake', 'LensModel', 'Flash', 'FNumber', 'FocalLength', 'ExposureTime', 'ISO'];
              const exifs = new Map();

              exif.forEach(element => {
                for (const tag of tags.values()) {
                  if (element.tag === tag)
                    return exifs.set(tag, element.raw._content)
                }
              });

              pic.exif = Object.fromEntries(exifs);
            }).catch(function (pics_exif) {
              console.error('uh oh :/ issue getting exif', pics_exif)
            });
            
            collection.albums[i].pics.push(pic);
            loadFolder_albums(pic);
          });
        }
      }).catch(function (pics_info) {
        console.error('uh oh :/ issue getting pics', pics_info)
      });
  }
  folder_pics = collection;
  console.log("yay! successfully connected to flickr, here's all your stuff :)", folder_pics);

  loadFolder_pics();
  
  }
}

function loadFolder_pics() {
  var dialog_content = $('<div></div>');
  const title = folder_pics.title;
  const description = folder_pics.description;
  const id = folder_pics.id;
  const content = folder_pics.content;

  dialog_content.dialog({
    autoOpen: false,
    maxHeight: 500,
    minWidth: 300,
    title: title,
    dialogClass: title,
    show: {
      effect: "scale",
      duration: 500
    }
  })
  .addClass("content-" + title);


  for (let index = 0; index < folder_pics.albums.length; index++) {
  const album = folder_pics.albums[index];
       const content = '<div id="'
       + album.title +
       '-folder" class="folder-icon" onclick="openFolder(\''
       + album.title + 
       '\')"><div><img src="/slaptop/assets/icons/Folder.png"></div><span>'
       + album.title +
       '</span></div>';
       const description = folder_pics.albums[index].description

      $('.content-' + title).append(content);
      

     function albums() {
      $('body').append('<div id="' + album.title + '"></div>');
      $('#' + album.title + '').dialog({
        autoOpen: false,
        maxHeight: 500,
        minWidth: 300,
        title: album.title,
        dialogClass: album.title,
        show: {
          effect: "scale",
          duration: 500
        }
      })
      .addClass("content-" + album.title);
     }
     albums();
     $("." + album.title).children(".ui-dialog-titlebar").append("<button id='help" + album.title + "' class='ui-button ui-widget ui-state-default ui-corner-all ui-button-icon-only ui-dialog-titlebar-help' type='button' role='button' title='Help' onclick='alert(\"" + description + "\")'><span class='ui-button-icon-primary ui-icon ui-icon-help'></span><span class='ui-button-text'>Help</span></button>");
  }

  $("." + title).children(".ui-dialog-titlebar").append("<button id='help" + title + "' class='ui-button ui-widget ui-state-default ui-corner-all ui-button-icon-only ui-dialog-titlebar-help' type='button' role='button' title='Help' onclick='alert(\"" + description + "\")'><span class='ui-button-icon-primary ui-icon ui-icon-help'></span><span class='ui-button-text'>Help</span></button>");
}


function loadFolder_albums(pic) {
  var dialog_content = $('<div></div>');
  const content = '<div id="'
  + pic.title +
  '-folder" class="folder-icon" onclick="openFolder(\''
  + pic.title + 
  '\')"><div><img src="' + pic.url + '"></div><span>'
  + pic.title +
  '</span></div>';
  const img = '<img src="' + pic.url + '">'

  $('.content-' + pic.album).append(content);
  const description = 'date: '+ pic.date_taken +',  place: '+ pic.geo.region +', '+ pic.geo.county +', '+ pic.geo.neighbourhood 
  + ''


  
  dialog_content.dialog({
    autoOpen: false,
    maxHeight: 500,
    minWidth: 300,
    title: pic.title,
    dialogClass: pic.title,
    show: {
      effect: "scale",
      duration: 500
    }
  })
  .addClass("content-" + pic.title)

  $('.content-' + pic.title).append(img);
  $("." + pic.title).children(".ui-dialog-titlebar").append("<button id='help" + pic.title + "' class='ui-button ui-widget ui-state-default ui-corner-all ui-button-icon-only ui-dialog-titlebar-help' type='button' role='button' title='Help' onclick='alert(\"" + description + "\")'><span class='ui-button-icon-primary ui-icon ui-icon-help'></span><span class='ui-button-text'>Help</span></button>");
}



function openFolder(folder) {
  $('.content-' + folder).dialog( "open" )
}

function slaptop_init() {

  navBar_init();
  flickr_init();

}

slaptop_init();