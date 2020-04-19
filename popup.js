$('#github').on('click', function(){
  window.oauth2.start();
})

$('#showToken').on('click', function () {
  chrome.storage.local.get('token', function (result) {
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

function prepareBookmarksForUpload(callback) {
  let output = {
    'description': 'Bookmarks',
    'files': {
      'bookmarks.json': {
        content: null
      },
      'other.json': {
        content: null
      }
    }
  }

  chrome.bookmarks.getSubTree('1', function (bookmarks) {
    cleanBookmarks(bookmarks, 'id')
    cleanBookmarks(bookmarks, 'dateAdded')
    cleanBookmarks(bookmarks, 'dateGroupModified')
    cleanBookmarks(bookmarks, 'parentId')

    // console.log(JSON.stringify(bookmarks, null, 2))
    output['files']['bookmarks.json']['content'] = JSON.stringify(bookmarks, null, 2)

    chrome.bookmarks.getSubTree('2', function (bookmarks) {
      cleanBookmarks(bookmarks, 'id')
      cleanBookmarks(bookmarks, 'dateAdded')
      cleanBookmarks(bookmarks, 'dateGroupModified')
      cleanBookmarks(bookmarks, 'parentId')

      // console.log(JSON.stringify(bookmarks, null, 2))
      output['files']['other.json']['content'] = JSON.stringify(bookmarks, null, 2)

      callback(output)
    })
  })
}

$('#upload').on('click', function () {
  let el = $('#upload');
  el.html('Uploading...');

  chrome.storage.local.get('token', function (result) {
    let token = result.token;
    prepareBookmarksForUpload((res)=>{
      $.ajax('https://api.github.com/gists/aaedf77f8433bee8f9792935d3f29f13', {
        'headers': {
          'Authorization': 'token ' + token,
          'Accept': 'application/vnd.github.v3+json'
        },
        'contentType': 'application/json',
        'dataType': 'json',
        'type': 'PATCH',
        'data': JSON.stringify(res)
      })
      .done((res) => {
        el.html('Updated!')
      })
      .fail((err)=>{
        // console.log('err', err)
        let message = '';
        if (err.status == 401) {
          message = 'Permission Denied. Please update your GitHub token by clicking the GitHub button.';
        }
        alert(`Sorry there was a problem:\n${message}`)
      })
    })
  });
})


function createBookmarks(bookmark, parentId) {
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

function removeBookmarks() {
  return new Promise((resolve, reject)=>{
    // remove main bookmarks
    chrome.bookmarks.getChildren('1', (bookmarks) => {
      bookmarks.forEach(bookmark => {
        // unable to delete the special "other bookmarks" with ID == '2
        if (bookmark.id != '2') chrome.bookmarks.removeTree(bookmark.id)
      })

      // remove other bookmarks
      chrome.bookmarks.getChildren('2', (bookmarks) => {
        bookmarks.forEach(bookmark => {
          chrome.bookmarks.removeTree(bookmark.id)
        })

        resolve()
      });
    });
  })
}

$('#download').on('click', function () {
  let el = $('#download');
  el.html('Downloading...');

  chrome.storage.local.get('token', function (result) {
    let token = result.token;

    // download bookmarks from gist
    $.ajax('https://api.github.com/gists/aaedf77f8433bee8f9792935d3f29f13', {
      'headers': {
        'Accept': 'application/vnd.github.v3+json'
      },
      'dataType': 'json',
      'type': 'GET'
    })
    .then((data) => {
      let bookmarks = JSON.parse(data.files['bookmarks.json'].content)[0];
      let otherBookmarks = JSON.parse(data.files['other.json'].content)[0];
      // console.log(bookmarks);
      // console.log(otherBookmarks);

      removeBookmarks()
        .then(() => {
          // add downloaded bookmarks
          bookmarks.children.forEach(element => createBookmarks(element, '1'));
          otherBookmarks.children.forEach(element => createBookmarks(element, '2'));
        })

      el.html('Done!')
    })
    .fail((err)=>{
      console.log('err', err)
      let message = ''
      if (err.status == 404) {
        message = 'Unable to find the bookmark. Please check your Gist id.'
      }
      alert(`Unable to download bookmarks:\n${message}`)
    })
  });
})
