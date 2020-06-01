#!/usr/bin/env node
const Steam = require('steam')
const SteamUser = require('steam-user')
const SteamTotp = require('steam-totp')
const fs = require('fs')
let config
if (fs.existsSync('./config.json')) {
  config = require('./config.json')
  if (!compareKeys(config, require('./config.example.json'))) {
    log('Config file has been changed, please check config.example.json')
    process.exit(1)
  };
} else {
  log('Config file not present, please create one or copy it from config.example.json file')
  process.exit(0)
}

if (config.username === '' || config.password === '') {
  log('Edit config.json! Add you username and password and start the bot')
  process.exit(1)
}

const responded = []

let playme = config.gamestoplay
log('Initalizing bot...')
log('Removing duplicate ids from game array...')
const templay = parseInt(playme.length)
if (config.donotsort === false) {
  playme = uniq(playme)
};

log('Removed ' + parseInt(templay - playme.length) + ' games')

if (playme.length > 33 && config.bypasslimit === false) {
  log('You are only able to idle 33 games at once due to steam limitation... Delete some ID numbers in config to start idling')
  process.exit(1)
};

if (config.bypasslimit === true) {
  log('WARNING: Bypassing the game limit may affect you steam account')
};

const client = new SteamUser({
  autoRelogin: true
})

// functions

function uniq (a) {
  return a.sort().filter(function (item, pos, ary) {
    return !pos || item !== ary[pos - 1]
  })
}

function log (message) {
  const date = new Date()
  const time = [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()]
  for (let i = 1; i < 6; i++) {
    if (time[i] < 10) {
      time[i] = '0' + time[i]
    }
  }
  console.log(time[0] + '-' + time[1] + '-' + time[2] + ' ' + time[3] + ':' + time[4] + ':' + time[5] + ' - ' + message)
}

function compareKeys (a, b) {
  const aKeys = Object.keys(a).sort()
  const bKeys = Object.keys(b).sort()
  return JSON.stringify(aKeys) === JSON.stringify(bKeys)
}

// endfunc

function shutdown (code) {
  setTimeout(function () {
    process.exit(code)
  }, 500)
}

// methods

client.logOn({
  accountName: config.username,
  password: config.password,
  promptSteamGuardCode: false,
  twoFactorCode: SteamTotp.getAuthCode(config.twofactorcode),
  rememberPassword: true
})

client.on('loggedOn', function (details, parental) {
  client.webLogOn()
  client.getPersonas([client.steamID], function (err, steamid) {
    if (err) log('Error: ' + err)
    log('Logged into Steam as ' + steamid[client.steamID].player_name)
    client.requestFreeLicense(playme)
    log('Idling: ' + playme.length + ' games, getting ' + (playme.length * 24) + ' hours per day | ' + (playme.length * 336) + ' hours per 2 weeks')
    client.gamesPlayed(playme)
    if (config.silent === false) {
      client.setPersona(Steam.EPersonaState.Online)
    };
  })
})

client.on('error', function (e) {
  log('Client error' + e)
  shutdown(1)
})

client.on('friendMessage', function (steamid, message) {
  if (config.sendautomessage === true && responded.indexOf(steamid.getSteamID64()) === -1) {
    client.getPersonas([steamid], function (err, steamids) {
      if (err) log('Error: ' + err)
      log('Message from ' + steamids[steamid].player_name + ' ID:[' + steamid.getSteamID64() + ']: ' + message)
      client.chatMessage(steamid, config.automessage)
      responded.push(steamid.getSteamID64())
    })
  };
})

client.on('lobbyInvite', function (inviterID, lobbyID) {
  if (config.sendautomessage === true && responded.indexOf(inviterID.getSteamID64()) === -1) {
    responded.push(inviterID.getSteamID64())
    client.chatMessage(inviterID, config.automessage)
  };
})

process.on('SIGINT', function () {
  log('Logging off and shutting down')
  shutdown(0)
})
