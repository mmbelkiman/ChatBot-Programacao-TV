"use strict";

const express = require("express");
const bodyParser = require("body-parser");
const fetch = require('node-fetch');
const restService = express();

restService.use(
  bodyParser.urlencoded({
    extended: true
  })
);

restService.use(bodyParser.json());

restService.post("/echo", function (req, res) {
  let channelName = req.body.queryResult.parameters.channelName;

  getCurrentShowName(channelName).then((output) => {
    res.json({
      'fulfillmentText': channelName + ' está passando ' + output
    });
  }).catch(error => {
    res.json({
      'fulfillmentText': `PROBLEMA AO PROCESSAR! ` + channelName + " - " + error
    });
  });
});


function getCurrentShowName(channelName) {
  return new Promise((resolve, reject) => {
    getChannelId(channelName).then(id => getCurrentShowWithId(id).then(showObj => {
      resolve(showObj.titulo);
    })).catch(error => {
      reject(error);
    });
  });
}

function getCurrentShowWithId(channelId) {
  return new Promise((resolve, reject) => {
    let currentdate = new Date();
    let _return = '';

    let dateStart = currentdate.getFullYear() + "-" + (currentdate.getMonth() + 1) + "-" + currentdate.getDate();
    let timeStart = 'T00:00:00Z';
    let dateEnd = '2019-12-29';
    let timeEnd = 'T23:59:00Z';

    fetch(
        'https://programacao.netcombo.com.br/gatekeeper/exibicao/select?q=id_revel:1_' + channelId +
        '+&callback=callbackShows&json.wrf=callbackShows&wt=json&rows=100000&sort=id_canal%20asc,dh_inicio%20asc&fl=dh_fim%20dh_inicio%20st_titulo%20titulo%20id_programa%20id_canal&fq=dh_inicio:%5B' +
        dateStart + timeStart + '%20TO%20' + dateEnd + timeEnd + '%5D&callback=callbackShowsRequest%20method:GET'
      )
      .then(response => {
        return response.text();
      })
      .then(final => {
        let novaString = final.substring("callbackShows(".length, final.length - 1);
        var obj = JSON.parse(novaString);

        if (obj.response.docs.length > 0) {
          obj.response.docs.forEach(element => {
            if (_return === '') {
              let showDateStringWihoutTimezone = element['dh_fim'].replace("Z", "-03:00");
              let showDateEnd = new Date(showDateStringWihoutTimezone);

              if (showDateEnd > currentdate) {
                _return = element;
              }
            }
          });
          resolve(_return);
        } else {
          reject(_return);
        }
      })
  });
}

function getChannelId(channelName) {
  let _return = -1;

  return new Promise((resolve, reject) => {
    fetch(
        'https://programacao.netcombo.com.br/gatekeeper/canal/select?q=id_cidade:1&callback=callbackChannels&json.wrf=callbackChannels&wt=json&rows=10&start=0&sort=cn_canal%20asc&fl=id_canal%20st_canal%20cn_canal%20nome%20url_imagem&fq=nome:' +
        channelName + '&_=1577582659100&callback=callbackChannels'
      )
      .then(response => {
        return response.text();
      })
      .then(final => {
        let novaString = final.substring("callbackChannels(".length, final.length - 1);
        var obj = JSON.parse(novaString);

        //TODO verifiy is first, is the correct to the search (it's a problem when have two or more channel with same name, like History and History 2)
        if (obj.response.docs.length > 0) {
          _return = obj.response.docs[0]["id_canal"];
          resolve(_return);
        } else {
          reject(_return);
        }
      })
  });
}

restService.listen(process.env.PORT || 8000, function () {
  console.log("Server up and listening");
});