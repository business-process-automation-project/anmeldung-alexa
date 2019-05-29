var mqtt = require('mqtt')
var client  = mqtt.connect('mqtt://141.56.180.120')

client.on('connect', function () {
    client.subscribe('BPA')
    client.publish('BPA', 'Hello World')
  })