var iKettle = require('ikettle.js-master');

var kettles = [];
var getKettle = function (device_id) {
    for (var x = 0; x < kettles.length; x++) {
        if (kettles[x].id === device_id) {
            return kettles[x];
        }
    }
};

module.exports.init = function (devices, callback) {

    //TODO proper kettle discovery/pairing including multiple devices support
    var myKettle = new iKettle();

    // Find kettle on network
    myKettle.discover(function (error, success) {

        // Check for error/success
        if (error) {
            Homey.log('Error: ' + error);
            return;
        }
        else {
            Homey.log('Connected to an iKettle on ip ' + myKettle.kettle._host);
        }

        // Add kettle to array of found devices (for multiple devices support)
        kettles.push({
            name: 'iKettle' + ((kettles.length > 0) ? (' ' + kettles.length + 1) : ''),
            ip: myKettle._host,
            get id() {
                return this.name + '_' + this.ip;
            }
        });
    });

    //TODO the state model functionality below can be removed once implemented by ikettle.js
    // Create myKettle state model
    myKettle.state = {
        onoff: false,
        removed: false,

        keep_warm: false,
        keep_warm_time: null,
        keep_warm_expired: false,

        overheat: false,
        boiled: false,
        boiling: false,
        temperature: null
    };

    // Update iKettle state model
    myKettle.on('off', function () {
        myKettle.onoff = false;

    }).on('removed', function () {
        myKettle.docked = false;

    }).on('overheat', function () {
        myKettle.overheat = true;

    }).on('boiled', function () {
        myKettle.boiled = true;

    }).on('keep-warm-expired', function () {
        myKettle.keep_warm_expired = true;

    }).on('boiling', function () {
        myKettle.boiling = true;
        myKettle.onoff = true;

    }).on('keep-warm', function (state) {
        myKettle.keep_warm = state;

    }).on('temperature', function (temperature) {
        myKettle.temperature = temperature;

    }).on('keep-warm-time', function (time) {
        myKettle.keep_warm_time = time;

    });
}

module.exports.pair = {
    list_devices: function (callback, emit, data) {
        //TODO implement listing devices
        callback(kettles);
    },
    add_device: function () {
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
            return myKettle.state.onoff
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
            return myKettle.state.temperature
        },
        set: function (device_data, temperature, callback) {
            myKettle.setTemperature(temperature, callback)
        }
    },

    keepwarm: {
        get: function (device_data, callback) {
            return {
                keep_warm: myKettle.state.keep_warm,
                keep_warm_time: myKettle.state.keep_warm_time
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
            return myKettle.state.boiled
        }
    },

    docked: {
        get: function (device_data, callback) {

            // Return docked state
            return myKettle.state.docked
        }
    }
}