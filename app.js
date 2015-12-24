"use strict";

var self = module.exports = {
	init: function () {

		// On kettle has boiled
		Homey.manager('flow').on('trigger.boiled', function (callback, args) {

			// Check if event triggered is equal keep_warm and if arg is set to false
			if (typeof args === "object" && args.data === false) {
				callback(true);
			}
			else {
				callback(false);
			}
		});

		// On kettle removed from dock
		Homey.manager('flow').on('trigger.removed', function (callback, args) {

			// Check if event triggered is equal keep_warm and if arg is set to false
			if (typeof args === "object" && args.data === true) {
				callback(true);
			}
			else {
				callback(false);
			}
		});

		// On keep_warm time expired
		Homey.manager('flow').on('trigger.keep_warm', function (callback, args) {

			// Check if event triggered is equal keep_warm and if arg is set to false
			if (typeof args === "object" && args.data === false) {
				callback(true);
			}
			else {
				callback(false);
			}
		});

		// When keeping warm
		Homey.manager('flow').on('condition.keep_warm', function (callback, args) {

			// Toggle keep warm capability of ikettle
			Homey.manager('drivers').getDriver('ikettle').capabilities.keep_warm.get(args.device, function (err, data) {

				// If success and proper callback return success
				if (!err && data) {
					if (typeof callback === "function") callback(data);
				}
			});
		});

		// Trigger on/off
		Homey.manager('flow').on('action.onoff', function (callback, args) {
			var temperature = parseInt(args.temperature);
			var keep_warm = (args.keep_warm == "true") ? true : false;

			// Check for correct input
			if (typeof args === "object" && typeof temperature === "number") {

				// Toggle onoff capability of ikettle
				Homey.manager('drivers').getDriver('ikettle').capabilities.onoff.set(args.device, {
					onoff: true
				}, function (err, success) {

					// If success and proper callback return success
					if (!err && success) {
						// Toggle temperature capability of ikettle
						Homey.manager('drivers').getDriver('ikettle').capabilities.temperature.set(args.device, temperature, function (err, success) {

							// If success and proper callback return success
							if (!err && success) {

								if (keep_warm) {
									// Toggle temperature capability of ikettle
									Homey.manager('drivers').getDriver('ikettle').capabilities.keep_warm.set(args.device, keep_warm, function (err, success) {

										// If success and proper callback return success
										if (!err && success) {
											if (typeof callback === "function") callback(success);
										}
									});
								}
							}
						});
					}
				});
			}
		});
	}
};