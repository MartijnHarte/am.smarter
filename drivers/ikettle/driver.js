//TODO implement custom capabilites and flow cards and realtime
//TODO implement multiple devices

/**
 * Import iKettle library
 */
var iKettle = require( 'ikettle.js' );
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
 * Init function that adds devices already present, and starts searching for
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
        if ( !error && success ) {
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
    if ( typeof callback === "function" ) callback( true );
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
        if ( typeof callback === "function" )callback( list_kettles );
    },

    add_device: function ( callback, emit, device ) {

        // Get kettle to be added
        var new_kettle = getKettle( device.data.id, temp_kettles );

        // If device found
        if ( new_kettle ) {

            // Store device as installed
            kettles.push( new_kettle );
        }
        else {

            // Return an error
            return throwError( callback );
        }
    }
};

/**
 * This represents the capabilities of an iKettle
 */

module.exports.capabilities = {

    onoff: {
        get: function ( device_data, callback ) {
            if ( device_data instanceof Error || !device_data.id ) return callback( device_data );

            // Get kettle
            var kettle = getKettle( device_data.id );

            // Check for kettle
            if ( kettle ) {

                // Return on/off state from kettle
                if ( typeof callback === "function" ) callback( null, kettle.data.onoff );
            }
            else {

                // Throw error
                return throwError( callback );
            }
        },
        set: function ( device_data, onoff, callback ) {
            if ( device_data instanceof Error || !device_data.id ) return callback( device_data );

            // Get kettle
            var kettle = getKettle( device_data.id );

            // Check for kettle
            if ( kettle ) {

                if ( onoff ) {

                    // Turn on
                    kettle.data.socket.boil();
                }
                else {

                    // Turn off
                    kettle.data.socket.off();
                }

                // Return success
                if ( typeof callback === "function" ) callback( null, onoff );
            }
            else {

                // Throw error
                return throwError( callback );
            }
        }
    },

    temperature: {
        get: function ( device_data, callback ) {
            if ( device_data instanceof Error || !device_data.id ) return callback( device_data );

            // Get kettle
            var kettle = getKettle( device_data.id );

            // Check for kettle
            if ( kettle ) {

                // Return temperature state from kettle
                if ( typeof callback === "function" ) callback( null, kettle.data.temperature );
            }
            else {

                // Throw error
                return throwError( callback );
            }
        },
        set: function ( device_data, temperature, callback ) {
            if ( device_data instanceof Error || !device_data.id ) return callback( device_data );

            // Get kettle
            var kettle = getKettle( device_data.id );

            // Check for kettle
            if ( kettle ) {

                // Get closest temperature match
                var temperature_options = [ 65, 80, 90, 100 ];
                var closest_temp = temperature_options.reduce( function ( prev, curr ) {
                    return (Math.abs( curr - temperature ) < Math.abs( prev - temperature ) ? curr : prev);
                } );

                kettle.data.socket.setTemperature( closest_temp, function ( error ) {
                    if ( typeof callback === "function" ) callback( error, closest_temp );
                } );
            }
            else {

                // Throw error
                return throwError( callback );
            }
        }
    },

    keep_warm: {
        get: function ( device_data, callback ) {
            if ( device_data instanceof Error || !device_data.id ) return callback( device_data );

            // Get kettle
            var kettle = getKettle( device_data.id );

            // Check for kettle
            if ( kettle ) {

                // Return keep_warm state from kettle
                if ( typeof callback === "function" ) callback( null, kettle.data.keep_warm );
            }
            else {

                // Throw error
                return throwError( callback );
            }
        },
        set: function ( device_data, keep_warm, callback ) {
            if ( device_data instanceof Error || !device_data.id ) return callback( device_data );

            // Get kettle
            var kettle = getKettle( device_data.id );

            // Check for kettle
            if ( kettle && keep_warm ) {

                // Turning keep warm on/off
                if ( keep_warm.onoff ) {

                    // Turn on keep warm
                    kettle.data.socket.setKeepWarmTime( (keep_warm.time) ? keep_warm.time : 20, function ( error ) {
                        if ( typeof callback === "function" ) callback( error, keep_warm.onoff );
                    } );
                }
                else {

                    // Turn off
                    kettle.data.socket.off( function ( error ) {
                        if ( typeof callback === "function" ) callback( error, keep_warm.onoff );
                    } );
                }
            }
            else {

                // Throw error
                return throwError( callback );
            }
        }
    },

    boiled: {
        get: function ( device_data, callback ) {
            if ( device_data instanceof Error || !device_data.id ) return callback( device_data );

            // Get kettle
            var kettle = getKettle( device_data.id );

            // Check for kettle
            if ( kettle ) {

                // Return temperature state from kettle
                if ( typeof callback === "function" ) callback( null, kettle.data.boiled );
            }
            else {

                // Throw error
                return throwError( callback );
            }
        }
    }
};

/**
 * This function makes sure the internally stored data of a device
 * remains up to date with the devices' state
 * @param device
 */
function updateKettleData ( device ) {

    // Update data
    if ( device ) {
        device.data.socket.on( 'off', function () {
            device.data.onoff = false;

        } ).on( 'removed', function () {

            // Reset data
            device.data.boiled = false;
            device.data.overheat = false;
            device.data.keep_warm_expired = false;
            device.data.boiling = false;
            device.data.keep_warm = false;

        } ).on( 'overheat', function () {
            device.data.overheat = true;

        } ).on( 'boiled', function () {
            device.data.boiled = true;

            // Boiling done
            module.exports.realtime( device.data, 'boiled', true );

        } ).on( 'keep-warm-expired', function () {
            device.data.keep_warm_expired = true;

            // Keep warm done
            module.exports.realtime( device.data, 'keep_warm', false );

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
    }
};

/**
 * Util function that gets the correct iKettle from the kettles
 * array by its device_id
 * @param device_id
 * @returns {Device}
 */
function getKettle ( device_id, list ) {
    var devices = list ? list : kettles;
    for ( var x = 0; x < devices.length; x++ ) {
        if ( devices[ x ].data.id === device_id ) {
            return devices[ x ];
        }
    }
};

/**
 * Handles throwing a proper error
 * @param callback
 * @returns {Error}
 */
function throwError ( callback ) {

    // Check for valid callback
    if ( typeof callback === "function" ) {

        // Return error
        return callback( new Error( 'Could not find kettle' ) );
    }
    else {
        return new Error( 'Could not find kettle' );
    }
}