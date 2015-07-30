var iKettle = require('ikettle.js-master');
var Backbone = require('backbone');

var kettles = [];


module.exports.init = function ( devices, callback ) {

    //TODO proper kettle discovery/pairing including multiple devices support
    var myKettle = new iKettle();

    // Find kettle on network
    myKettle.discover(function(error, success){
        if(error){
            Homey.log('Error: ' + error);
            return;
        }

        Homey.log('Connected to an iKettle on ip ' + myKettle._host);

        kettles [myKettle._host] = {
            id: myKettle._host,
            name: 'iKettle',
            ip: myKettle._host
        }

        // Update kettle state
        myKettle.getStatus()

    });

    //TODO the state model functionality below can be removed once implemented by ikettle.js
    // Create myKettle state model
    myKettle.state = new Backbone.Model({
        "onoff": false,
        "removed": false,

        "keep-warm": false,
        "keep-warm-time": null,
        "keep-warm-expired": false,

        "overheat": false,
        "boiled": false,
        "boiling": false,
        "temperature": null
    });

    // Update iKettle state model
    myKettle.on('off', function(){
        iKettleState.set('onoff', false)

    }).on('removed', function() {
        iKettleState.set('docked', false)

    }).on('overheat', function () {
        iKettleState.set('overheat', true)

    }).on('boiled', function () {
        iKettleState.set('boiled', true)

    }).on('keep-warm-expired', function () {
        iKettleState.set('keep-warm-expired', true)

    }).on('boiling', function () {
        iKettleState.set('boiling', true)
        iKettleState.set('onoff', true)

    }).on('keep-warm', function (state) {
        iKettleState.set('keep-warm', state)

    }).on('temperature', function (temperature) {
        iKettleState.set('temperature', temperature)

    }).on('keep-warm-time', function (time) {
        iKettleState.set('keep-warm-time', time)

    });
}

module.exports.pair = {
    list_devices: function ( callback, emit, data){
        //TODO implement listing devices
        callback (kettles);
    },
    add_device: function ( ) {
        //TODO implement add device
    }
}

module.exports.capabilities = {
    name: {
        get: function (device_data, callback) {
            if (callback) callback()

            return device_data;

        },
        set: function (device_data, name, callback) {
            device_data.name = name;
            if (callback) callback()
        }
    },

    onoff: {
        get: function (device_data, callback) {

            // Read on/off state from kettle state model
            return myKettle.state.get('onoff')
        },
        set: function (device_data, onoff, callback) {

            //If turn on
            if (onoff) {
                myKettle.boil();

            } //If turn off
            else {

                myKettle.off();
            }
            if (callback) callback();
        }
    },

    temperature: {
        get: function (device_data, callback) {

            // Read temperature state from kettle state model
            return myKettle.state.get('temperature')
        },
        set: function (device_data, temperature, callback) {
            myKettle.setTemperature(temperature, callback)
        }
    },

    keepwarm: {
        get: function (device_data, callback) {
            return {
                "keep-warm": myKettle.state.get('keep-warm'),
                "keep-warm-time": myKettle.state.get('keep-warm-time')
            }

        },
        set: function (device_data, time, callback) {
            myKettle.keepWarm(callback)

            if (time !== null) {
                myKettle.setKeepWarmTime(time)
            }
        }
    },

    boiled: {
        get: function (device_data, callback) {

            // Read temperature state from kettle state model
            return myKettle.state.get('boiled')
        }
    },

    docked: {
        get: function (device_data, callback) {
            return myKettle.state.get('docked')
        }
    }
}