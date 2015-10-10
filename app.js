"use strict";

var self = module.exports = {
    init: function () {

        // On triggered flow
        Homey.manager( 'flow' ).on( 'action.keep_warm_time', function ( args, callback ) {

            // Toggle keep warm capability of ikettle
            Homey.manager( 'drivers' ).getDriver( 'ikettle' ).keep_warm.set( args.device, {
                onoff: true,
                time: args.keep_warm_time
            }, function ( err, success ) {

                // If success and proper callback return success
                if ( !err && success ) {
                    if ( typeof callback === "function" ) callback( err, success );
                }
            } );
        } );
    }
}