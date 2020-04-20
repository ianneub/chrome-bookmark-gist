function getCurrentId() {
  chrome.storage.sync.get('id', (storage) => {
    let html = `<a target="_blank" href="https://gist.github.com/${storage.id}">${storage.id}</a>`
    let el = $('#currentId')

    if (storage.id == undefined) {

    } else {
      el.html(html)
    }
  })
}

$(window).on('load', (e)=>{
  getCurrentId()
})

$('#options').on('submit', (e)=>{
  e.preventDefault()

  let el = $('input[name="gistId"]')

  chrome.storage.sync.set({ id: el.val() }, () => {
    console.log('Gist ID is ' + el.val())
    getCurrentId()
    el.val('')
  })
})
