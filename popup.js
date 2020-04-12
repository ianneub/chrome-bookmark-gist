$('#github').on('click', function(){
  window.oauth2.start();
})

$('#getToken').on('click', function () {
  chrome.storage.local.get("token", function (result) {
    alert(result.token)
  })
})

function cleanBookmarks(obj, field) {
  for (prop in obj) {
    if (prop === field)
      delete obj[prop];
    else if (typeof obj[prop] === 'object')
      cleanBookmarks(obj[prop], field);
    else if (Array.isArray(obj[prop])) {
      obj[prop].forEach(element => {
        cleanBookmarks(element, field)
      });
    }      
  }
}

$('#upload').on('click', function () {
  let el = $('#upload');
  el.html('Uploading...');

  chrome.storage.local.get("token", function (result) {
    let token = result.token;

    chrome.bookmarks.getSubTree('1', function (bookmarks) { 
      cleanBookmarks(bookmarks, 'id')
      cleanBookmarks(bookmarks, 'dateAdded')
      cleanBookmarks(bookmarks, 'dateGroupModified')
      cleanBookmarks(bookmarks, 'parentId')

      // console.log(JSON.stringify(bookmarks, null, 2))

      let data = {
        "description": "Bookmarks",
        "files": {
          "bookmarks.json": {
            content: JSON.stringify(bookmarks, null, 2)
          }
        }
      }

      $.ajax('https://api.github.com/gists/aaedf77f8433bee8f9792935d3f29f13', {
        "headers": {
          "Authorization": "token " + token,
          "Accept": "application/vnd.github.v3+json"
        },
        "contentType":"application/json",
        "dataType":"json",
        "type": "PATCH",
        "data": JSON.stringify(data),
        "success": function (data) {
          el.html("Updated!")
        }
      });
    })
  });
})


function createBookmarks(bookmark, parentId){
  if ('children' in bookmark) {
    chrome.bookmarks.create({
      title: bookmark.title,
      index: bookmark.index,
      parentId: parentId
    }, function (result) {
      bookmark.children.forEach(element => {
        createBookmarks(element, result.id)
      });
    })
  } else {
    chrome.bookmarks.create({
      title: bookmark.title,
      url: bookmark.url,
      index: bookmark.index,
      parentId: parentId
    })
  }
}

$('#download').on('click', function () {
  let el = $('#download');
  el.html('Downloading...');

  chrome.storage.local.get("token", function (result) {
    let token = result.token;

    // download bookmarks from gist
    $.ajax('https://api.github.com/gists/aaedf77f8433bee8f9792935d3f29f13', {
      "headers": {
        "Authorization": "token " + token,
        "Accept": "application/vnd.github.v3+json"
      },
      "dataType": "json",
      "type": "GET",
      "success": function (data) {
        let bookmarks = JSON.parse(data.files['bookmarks.json'].content)[0];
        // console.log(bookmarks)
        
        // find and delete all bookmarks
        chrome.bookmarks.getChildren('1', function (results) {
          results.forEach(element => {
            chrome.bookmarks.removeTree(element.id)
          });
        });
        
        bookmarks.children.forEach(element => createBookmarks(element));

        el.html("Done!")
      }
    });
  });
})
