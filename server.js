var path = require('path')
var express = require('express')
var app = express()
var bodyParser = require('body-parser')

var request = require('request')
var moment = require('moment')

var PORT = process.env.PORT || 3000;
var distRoot = './htdocs'

app.use(bodyParser.json())
app.use(express.static(distRoot))

const channelId = 'UCuyMdj0yUzGSz2wT-uLt6fA';
const apiKey = process.env.API_KEY;
const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&key=${apiKey}&maxResults=50`

function log() {
  console.log(moment().format(), ' - ', [].slice.call(arguments).join(', '));
}

let lastFetched = null;
function shouldRefreshVideoList() {
  let now = moment();

  if (!lastFetched) {
    return true;
  }

  let shouldRefresh = now.diff(lastFetched, 'hours') > 2
  return shouldRefresh;
}

let videoList = [];
function parseVideoResponse(response) {
  var parsedVideos = [];
  var resp = JSON.parse(response);

  log('parsing video response');

  resp.items.forEach(item => {
    if (item.id.kind === 'youtube#video') {
      parsedVideos.push({
        title: item.snippet.title,
        videoId: item.id.videoId,
        date: item.snippet.publishedAt
      })
    }
  });

  return parsedVideos;
}

function getVideoList() {
  return new Promise(resolve => {
    if (!shouldRefreshVideoList()) {
      return resolve(videoList);
    }

    log('fetching video list');
    request(url, function (error, response, body) {
      lastFetched = moment();

      if (!error && response.statusCode == 200) {
        videoList = parseVideoResponse(body);
      } else {
        log(`error: ${error}`, `status: ${response.statusCode}`)
      }
      resolve(videoList);
    })
  });
}

app.get("/list", function(req, res) {
  getVideoList().then(videos => res.json(videos));
})

app.get("*", function(req, res) {
  res.sendFile(path.join(__dirname, distRoot, "index.html"))
})

app.listen(PORT, function() {
  log(`running on ${PORT}`)
  if (!apiKey) {
    log('no api key provided')
  }
  getVideoList();
})
