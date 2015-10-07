//TODO implement keepWarmTime
//TODO implement multiple devices

/**
 * Import iKettle library
 */
var iKettle = require( 'ikettle.js-master' );
var _ = require( 'underscore' );

/**
 * Global variables to keep track of found
 * and installed kettles
 * @type {Array}
 */
var kettles = [];
var temp_kettles = [];
var myKettle = null;

/**
 * Init that adds devices already present, and starts searching for
 * new kettles
 * @param devices
 * @param callback
 */
module.exports.init = function ( devices_data, callback ) {

    // Make sure no data is left
    temp_kettles = [];

    // Instantiate new iKettle object
    myKettle = new iKettle();

    // Find kettle on network
    myKettle.discover( function ( error, success ) {

        // Check for success
        if ( success ) {
            var id = 'iKettle' + ((temp_kettles.length > 0) ? (' ' + temp_kettles.length + 1) : '') + myKettle.kettle._host;

            // Check if device was installed before
            var devices = (_.findWhere( devices_data, { id: id } )) ? kettles : temp_kettles;

            // Add kettle to array of found devices (for multiple devices support)
            devices.push( {
                name: 'iKettle' + ((devices.length > 0) ? (' ' + devices.length + 1) : ''),
                data: {
                    id: id,
                    socket: myKettle,

                    onoff: false,
                    removed: false,

                    keep_warm: false,
                    keep_warm_time: null,
                    keep_warm_expired: false,

                    overheat: false,
                    boiled: false,
                    boiling: false,
                    temperature: null
                }
            } );

            // Make sure incoming changes are registered
            updateKettleData( getKettle( id, devices ) );
        }
    } );

    // Ready
    callback( true );
};

/**
 * Pairing process, uses default list_devices and add_device
 */
module.exports.pair = {

    list_devices: function ( callback ) {

        // Construct list without device data
        var list_kettles = [];
        temp_kettles.forEach( function ( kettle ) {
            list_kettles.push( {
                data: {
                    id: kettle.data.id
                },
                name: kettle.name
            } );
        } );

        // List available kettles
        callback( list_kettles );
    },

    add_device: function ( callback, emit, device ) {

        // Store device as installed
        kettles.push( getKettle( device.data.id, temp_kettles ) );
    }
};

/**
 * This represents the capabilities of an iKettle
 */

module.exports.capabilities = {

    onoff: {
        get: function ( device_data, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            // Get kettle
            var kettle = getKettle( device_data.id );

            // Return on/off state from kettle
            if ( callback ) callback( null, kettle.data.onoff );
        },
        set: function ( device_data, onoff, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            // Get kettle
            var kettle = getKettle( device_data.id );

            if ( onoff ) {
                // Turn on
                kettle.data.socket.boil();
            }
            else {
                // Turn off
                kettle.data.socket.off();
            }

            if ( callback ) callback( null, onoff );
        }
    },

    temperature: {
        get: function ( device_data, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            // Get kettle
            var kettle = getKettle( device_data.id );

            // Return temperature state from kettle
            if ( callback ) callback( null, kettle.data.temperature );
        },
        set: function ( device_data, temperature, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            // Get kettle
            var kettle = getKettle( device_data.id );

            // Get closest temperature match
            var temperature_options = [ 65, 80, 90, 100 ];
            var closest_temp = temperature_options.reduce( function ( prev, curr ) {
                return (Math.abs( curr - temperature ) < Math.abs( prev - temperature ) ? curr : prev);
            } );

            kettle.data.socket.setTemperature( closest_temp, function ( error ) {
                callback( error, closest_temp );
            } );
        }
    },

    keep_warm: {
        get: function ( device_data, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            // Get kettle
            var kettle = getKettle( device_data.id );

            // Return keep_warm state from kettle
            if ( callback ) callback( null, kettle.data.keep_warm );
        },
        set: function ( device_data, keep_warm, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            // Get kettle
            var kettle = getKettle( device_data.id );

            kettle.data.socket.keepWarm( function ( error ) {
                callback( error, keep_warm );
            } );
        }
    },

    boiled: {
        get: function ( device_data, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            // Get kettle
            var kettle = getKettle( device_data.id );

            // Return temperature state from kettle
            if ( callback ) callback( null, kettle.data.boiled );
        }
    },

    docked: {
        get: function ( device_data, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            // Get kettle
            var kettle = getKettle( device_data.id );

            // Return docked state from kettle
            if ( callback ) callback( null, kettle.data.docked );
        }
    }
};

/**
 * This function makes sure the internally stored data of a device
 * remains up to date with the devices' state
 * @param device
 */
var updateKettleData = function ( device ) {

    // Update data
    device.data.socket.on( 'off', function () {
        device.data.onoff = false;

    } ).on( 'removed', function () {
        device.data.docked = false;

    } ).on( 'overheat', function () {
        device.data.overheat = true;

    } ).on( 'boiled', function () {
        device.data.boiled = true;

    } ).on( 'keep-warm-expired', function () {
        device.data.keep_warm_expired = true;

    } ).on( 'boiling', function () {
        device.data.boiling = true;
        device.data.onoff = true;

    } ).on( 'keep-warm', function ( state ) {
        device.data.keep_warm = state;

    } ).on( 'temperature', function ( temperature ) {
        device.data.temperature = temperature;

    } ).on( 'keep-warm-time', function ( time ) {
        device.data.keep_warm_time = time;
    } );
};

/**
 * Util function that gets the correct iKettle from the kettles
 * array by its device_id
 * @param device_id
 * @returns {*}
 */
var getKettle = function ( device_id, list ) {
    var devices = list ? list : kettles;
    for ( var x = 0; x < devices.length; x++ ) {
        if ( devices[ x ].data.id === device_id ) {
            return devices[ x ];
        }
    }
};