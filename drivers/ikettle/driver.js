//TODO test multiple devices

/**
 * Import iKettle library
 */
var iKettles = require('ikettle.js');
var _ = require('underscore');

/**
 * Global variables to keep track of found
 * and installed kettles
 * @type {Array}
 */
var kettles = [];
var preInstalledKettles = [];
var temp_kettles = [];
var myKettles = null;

/**
 * Init function that adds devices already present, and starts searching for
 * new kettles
 * @param devices
 * @param callback
 */
module.exports.init = function (devices_data, callback) {
	// Make sure no data is left
	temp_kettles = [];

	// Store pre-installed devices
	for (var x = 0; x < devices_data.length; x++) {
		preInstalledKettles.push({data: {id: devices_data[x].id}});
	}

	// Instantiate new iKettle object
	myKettles = new iKettles();

	// Start search for kettles
	searchForKettles();

	// Ready
	if (typeof callback === "function") callback(true);
};

/**
 * Pairing process, uses default list_devices and add_device
 */
module.exports.pair = function (socket) {

	socket.on('list_devices', function (data, callback) {

		searchForKettles(function () {

			//Construct list without device data
			var list_kettles = [];
			temp_kettles.forEach(function (kettle) {
				list_kettles.push({
					data: {
						id: kettle.data.id
					},
					name: kettle.name
				});
			});

			// List available kettles
			if (typeof callback === "function") callback(null, list_kettles);
		});
	});

	socket.on('add_device', function (data, callback) {
		// Get kettle to be added
		var new_kettle = getKettle(data.id, temp_kettles);

		// If device found
		if (new_kettle) {

			// Store device as installed
			kettles.push(new_kettle);
		}
		else {

			// Return an error
			return throwError(callback);
		}

		temp_kettles = [];
	});
};

/**
 * This represents the capabilities of an iKettle
 */
module.exports.capabilities = {

	onoff: {
		get: function (device_data, callback) {
			if (device_data instanceof Error || !device_data.id) return callback(device_data);

			// Get kettle
			var kettle = getKettle(device_data.id);

			// Check for kettle
			if (kettle) {

				// Return on/off state from kettle
				if (typeof callback === "function") callback(null, kettle.data.onoff);
			}
			else {

				// Throw error
				return throwError(callback);
			}
		},
		set: function (device_data, data, callback) {
			if (device_data instanceof Error || !device_data.id) return callback(device_data);

			// Get kettle
			var kettle = getKettle(device_data.id);

			// Check for kettle
			if (kettle) {

				if (data.onoff) {

					// Turn on
					kettle.data.kettle.boil();
				}
				else {

					// Turn off
					kettle.data.kettle.off();
				}

				// Return success
				if (typeof callback === "function") callback(null, data.onoff);
			}
			else {

				// Throw error
				return throwError(callback);
			}
		}
	},

	target_temperature: {
		get: function (device_data, callback) {
			if (device_data instanceof Error || !device_data.id) return callback(device_data);

			// Get kettle
			var kettle = getKettle(device_data.id);

			// Check for kettle
			if (kettle) {

				// Return temperature state from kettle
				if (typeof callback === "function") callback(null, kettle.data.temperature);
			}
			else {

				// Throw error
				return throwError(callback);
			}
		},
		set: function (device_data, temperature, callback) {
			if (device_data instanceof Error || !device_data.id) return callback(device_data);

			// Get kettle
			var kettle = getKettle(device_data.id);

			// Check for kettle
			if (kettle) {

				// Get closest temperature match
				var temperature_options = [65, 80, 95, 100];
				var closest_temp = temperature_options.reduce(function (prev, curr) {
					return (Math.abs(curr - temperature) < Math.abs(prev - temperature) ? curr : prev);
				});

				kettle.data.kettle.setTemperature(closest_temp, function (error) {
					if (typeof callback === "function") callback(error, closest_temp);
				});
			}
			else {

				// Throw error
				return throwError(callback);
			}
		}
	},

	keep_warm: {
		get: function (device_data, callback) {
			if (device_data instanceof Error || !device_data.id) return callback(device_data);

			// Get kettle
			var kettle = getKettle(device_data.id);

			// Check for kettle
			if (kettle) {

				// Return keep_warm state from kettle
				if (typeof callback === "function") callback(null, kettle.data.keep_warm);
			}
			else {

				// Throw error
				return throwError(callback);
			}
		},
		set: function (device_data, keep_warm, callback) {
			if (device_data instanceof Error || !device_data.id) return callback(device_data);

			// Get kettle
			var kettle = getKettle(device_data.id);

			// Check for kettle
			if (kettle) {

				// Turning keep warm on/off
				if (keep_warm) {

					// Turn on keep warm
					kettle.data.kettle.setKeepWarmTime(10, function (error) {
						kettle.data.kettle.keepWarm(function (error, success) {
							if (typeof callback === "function") callback(error, success);
						});
					});
				}
				else {

					// Turn off
					kettle.data.kettle.off(function (error) {
						if (typeof callback === "function") callback(error, keep_warm);
					});
				}
			}
			else {

				// Throw error
				return throwError(callback);
			}
		}
	},

	boiled: {
		get: function (device_data, callback) {
			if (device_data instanceof Error || !device_data.id) return callback(device_data);

			// Get kettle
			var kettle = getKettle(device_data.id);

			// Check for kettle
			if (kettle) {

				// Return temperature state from kettle
				if (typeof callback === "function") callback(null, kettle.data.boiled);
			}
			else {

				// Throw error
				return throwError(callback);
			}
		}
	},

	removed: {
		get: function (device_data, callback) {
			if (device_data instanceof Error || !device_data.id) return callback(device_data);

			// Get kettle
			var kettle = getKettle(device_data.id);

			// Check for kettle
			if (kettle) {

				// Return temperature state from kettle
				if (typeof callback === "function") callback(null, kettle.data.removed);
			}
			else {

				// Throw error
				return throwError(callback);
			}
		}
	}
};

function searchForKettles(callback) {

	// Start searching
	myKettles.discover(function (discoverSocket) {
		discoverSocket.on('found_device', function (kettle) {
			var id = generateDeviceID(kettle.kettle._host, "null");
			var foundKettle = _.filter(preInstalledKettles, function (kettle) { return kettle.data.id == id; });

			// Check if device was installed before
			var devices = (!_.isEmpty(foundKettle)) ? kettles : temp_kettles;

			// Add kettle to array of found devices (for multiple devices support)
			devices.push({
				name: 'iKettle' + ((devices.length > 0) ? (' ' + devices.length + 1) : ''),
				data: {
					id: id,
					socket: kettle.kettle,
					kettle: kettle,

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
			});

			// Make sure incoming changes are registered
			updateKettleData(getKettle(id, devices));
		});
		discoverSocket.on('done', function () {
			if (callback) callback();
		});
	});
}

/**
 * This function makes sure the internally stored data of a device
 * remains up to date with the devices' state
 * @param device
 */
function updateKettleData(device) {

	// Update data
	if (device) {
		device.data.kettle.on('off', function () {
			device.data.onoff = false;

		}).on('removed', function () {

			// Reset data
			device.data.boiled = false;
			device.data.overheat = false;
			device.data.keep_warm_expired = false;
			device.data.boiling = false;
			device.data.keep_warm = false;
			device.data.removed = true;

			// Removed kettle from dock
			Homey.manager('flow').trigger('removed');

		}).on('overheat', function () {
			device.data.overheat = true;

		}).on('boiled', function () {
			device.data.boiled = true;

			// Boiling done
			Homey.manager('flow').trigger('boiled');

		}).on('keep-warm-expired', function () {
			device.data.keep_warm_expired = true;

			// Keep warm done
			Homey.manager('flow').trigger('keep_warm');

		}).on('boiling', function () {
			device.data.boiling = true;
			device.data.onoff = true;

		}).on('keep-warm', function (state) {
			device.data.keep_warm = state;

			// Keep warm done
			Homey.manager('flow').trigger('keep_warm');

		}).on('temperature', function (temperature) {
			device.data.temperature = temperature;

		}).on('keep-warm-time', function (time) {
			device.data.keep_warm_time = time;
		});
	}
};

/**
 * Util function that gets the correct iKettle from the kettles
 * array by its device_id
 * @param device_id
 * @returns {Device}
 */
function getKettle(device_id, list) {
	var devices = list ? list : kettles;
	for (var x = 0; x < devices.length; x++) {
		if (devices[x].data.id === device_id) {
			return devices[x];
		}
	}
};

/**
 * Handles throwing a proper error
 * @param callback
 * @returns {Error}
 */
function throwError(callback) {

	// Check for valid callback
	if (typeof callback === "function") {

		// Return error
		return callback(new Error('Could not find kettle'));
	}
	else {
		return new Error('Could not find kettle');
	}
}

/**
 * Generates a unique ID based on two input parameters
 * @param param1
 * @param param2
 * @returns {string} unique device ID
 */
function generateDeviceID(param1, param2) {
	return new Buffer(param1 + param2).toString('base64');
}