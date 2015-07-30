"use strict";

function App()
{

}

module.exports = App;

App.prototype.init = function(){

	Homey.manager('ledring').animate({
		name: 'pulse'
	});

	// flow:condition:boiled
	Homey.manager('flow').on('condition.boiled', function( args, callback ){
		if( typeof args.device == 'undefined' ) return;
		var driver = Homey.manager('drivers').getDriver( args.device.driver.id );

		// Condition if kettle has boiled
		driver.capabilities.boiled.get( args.device.data, callback );
	});

	// flow:condition:boiling
	Homey.manager('flow').on('condition.boiling', function( args, callback ){
		if( typeof args.device == 'undefined' ) return;
		var driver = Homey.manager('drivers').getDriver( args.device.driver.id );

		// Condition if kettle is boiling
		driver.capabilities.onoff.get( args.device.data, callback );
	});

	// flow:condition:docked
	Homey.manager('flow').on('condition.docked', function( args, callback ){
		if( typeof args.device == 'undefined' ) return;
		var driver = Homey.manager('drivers').getDriver( args.device.driver.id );

		// Condition if kettle has boiled
		driver.capabilities.docked.get( args.device.data, callback );
	});

	// flow:action:boil
	Homey.manager('flow').on('action.boil', function( args, callback ){
		if( typeof args.device == 'undefined' ) return;
		var driver = Homey.manager('drivers').getDriver( args.device.driver.id );

		// Turn on boiling
		driver.capabilities.onoff.set( args.device.data, true, callback );

		//TODO integrate temp variable
		// Set given temperature on kettle
		if(args.temp){
			driver.capabilities.temperature.set( args.device.data, args.temp, callback )
		}
		else { // Else default to 100
			driver.capabilities.temperature.set( args.device.data, 100, callback )
		}
	});

	// flow:action:off
	Homey.manager('flow').on('action.off', function( args, callback ){
		if( typeof args.device == 'undefined' ) return;
		var driver = Homey.manager('drivers').getDriver( args.device.driver.id );

		// Turn off kettle
		driver.capabilities.onoff.set( args.device.data, false, callback );
	});

	// flow:action:temperature
	Homey.manager('flow').on('action.temperature', function( args, callback ){
		if( typeof args.device == 'undefined' ) return;
		var driver = Homey.manager('drivers').getDriver( args.device.driver.id );

		//TODO fetch temp from args
		//Set temperature on kettle
		driver.capabilities.temperature.set( args.device.data, args, callback );
	});

	// flow:action:keepWarm
	Homey.manager('flow').on('action.keepwarm', function( args, callback ){
		if( typeof args.device == 'undefined' ) return;
		var driver = Homey.manager('drivers').getDriver( args.device.driver.id );

		//TODO fetch keep warm time from args
		// Turn on keep warm (for certain time if param available)
		driver.capabilities.keepWarm.set( args.device.data, args.keepWarmTime, callback );
	});
};

App.prototype.speech = function( speech ) {

	// Direct reference to the driver
	var iKettle = Homey.manager('drivers').getDriver('ikettle');

	//TODO implement proper speech control
	if (trigger.id == 'kettle boil') {
		iKettle.capabilities.onoff.set( null, true, null )
	}
}