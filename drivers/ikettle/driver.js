//TODO implement keepWarmTime
//TODO add and keep track of states in kettles for use by capabilities
//TODO proper kettle discovery/pairing including multiple devices support

/**
 * Import iKettle library
 */
var iKettle = require( 'ikettle.js-master' );

/**
 * Global variables to keep track of added
 * and installed kettles
 * @type {Array}
 */
var kettles = [];
var temp_kettles = [];

/**
 * Init that adds devices already present, and starts searching for
 * new kettles
 * @param devices
 * @param callback
 */
module.exports.init = function ( devices, callback ) {

    // Initially add devices already installed
    devices.forEach( function ( device ) {
        kettles.push( device );
    } );

    // Instatiate new iKettle object
    var myKettle = new iKettle();

    // Find kettle on network
    myKettle.discover( function ( error, success ) {

        // Check for success
        if ( success ) {
            Homey.log( 'Connected to an iKettle on ip ' + myKettle.kettle._host );

            // Add kettle to array of found devices (for multiple devices support)
            temp_kettles.push( {
                name: 'iKettle' + ((temp_kettles.length > 0) ? (' ' + temp_kettles.length + 1) : ''),
                data: {
                    id: 'iKettle' + ((temp_kettles.length > 0) ? (' ' + temp_kettles.length + 1) : '') + myKettle._host,
                    kettle: myKettle
                }
            } );
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

        // List available kettles
        callback( temp_kettles );
    },

    add_device: function ( callback, emit, device ) {

        // Store device as installed
        kettles.push( device );
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
            if ( callback ) callback( kettle.data.onoff );
        },
        set: function ( device_data, onoff, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            if ( onoff ) {

                // Turn on
                device_data.kettle.boil();
            }
            else {
                // Turn off
                device_data.kettle.off();
            }

            if ( callback ) callback( onoff );
        }
    },

    temperature: {
        get: function ( device_data, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            // Get kettle
            var kettle = getKettle( device_data.id );

            // Return temperature state from kettle
            if ( callback ) callback( kettle.data.temperature );
        },
        set: function ( device_data, temperature, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            //TODO map temperature to nearest matching temp iKettle supports
            device_data.kettle.setTemperature( temperature, callback );
        }
    },

    keepwarm: {
        get: function ( device_data, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            // Get kettle
            var kettle = getKettle( device_data.id );

            // Return keepwarm state from kettle
            if ( callback ) callback( kettle.data.keepwarm );
        },
        set: function ( device_data, keepwarm, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            device_data.kettle.keepWarm( callback );

            if ( callback ) callback( time );
        }
    },

    boiled: {
        get: function ( device_data, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            // Get kettle
            var kettle = getKettle( device_data.id );

            // Return temperature state from kettle
            if ( callback ) callback( kettle.data.boiled );
        }
    },

    docked: {
        get: function ( device_data, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            // Get kettle
            var kettle = getKettle( device_data.id );

            // Return docked state from kettle
            if ( callback ) callback( kettle.data.docked );
        }
    }
};

/**
 * Util function that gets the correct iKettle from the kettles
 * array by its device_id
 * @param device_id
 * @returns {*}
 */
var getKettle = function ( device_id ) {
    for ( var x = 0; x < kettles.length; x++ ) {
        if ( kettles[ x ].data.id === device_id ) {
            return kettles[ x ];
        }
    }
};