var _ = require( "lodash" );
var scheduler = require( "../node_modules/anvil.js/lib/scheduler.js" )( _ );
var scaffold = require( "../lib/index.js" );
var expect = require( "expect.js" );

var filesystem = {};
var plugin;

var anvil = {
	scheduler: scheduler,
	log: {
		warning: function () {},
		error: function () {},
		debug: function () {}
	},
	reset: function () {
		anvil.config.activityOrder = [];
		plugin = null;
		filesystem = {};
	},
	config: {
		activityOrder: []
	},
	fs: {
		buildPath: function ( path ) {
			return path;
		},
		ensurePath: function ( path, done ) {
			path = path.split( "/" );
			var base = filesystem;
			var part;
			while( part = path.shift() ) {
				if ( !filesystem[ part ] ) {
					filesystem[ part ] = {};
				}
				base = filesystem[ part ];
			}
			done();
		},
		write: function ( path, content, done ) {
			path = path.split( "/" );
			var base = filesystem;
			var part;
			while( path.length > 1 ) {
				part = path.shift();
				if ( !filesystem[ part ] ) {
					filesystem[ part ] = {};
				}
				base = filesystem[ part ];
			}

			base[ path.shift() ] = content;
			done();
		}
	}, 
	plugin: function ( _plugin ) {
		plugin = _plugin;
		anvil.config.activityOrder.push( plugin.activity );
		return _plugin;
	}
}

var logOutput = "",
	log = console.log;


function hijackConsole() {
	console.log = function ( input ) {
		logOutput += input	+ "\n";
	};
}

function restoreConsole() {
	console.log = log;
}

var sampleScaffold1 = {
	type: "plugin",
	description: "An example plugin",
	output: {
		lib: {},
		src: {
			"index.js": "(function(){}());"
		},
		"build.json": "{}"
	}
};

var sampleScaffold2 = {
	type: "plugin",
	description: "An example plugin",
	output: function () {
		return {
			lib: function ( data, done ) {
				setTimeout( function () {
					done( {} );
				}, 200 );
			},
			src: {
				"index.js": function () {
					return "(function(){}());";
				}
			},
			"build.json": "{}"
		};
	}
};

var test = {}, noop = function(){};

describe( "anvil.scaffold", function () {
	beforeEach( function () {
		logOutput = "";
		anvil.reset();
		delete anvil.scaffold;
		scaffold( _, anvil, function() {
			// TEMPORARY: Will be removed when command
			// support is added to Anvil
			if ( test.callback ){
				test.callback();
			}
		});
	});

	describe( "When building a scaffold", function () {
		it( "should process key/values and generate the correct files and directories", function ( done ) {
			plugin.configure({}, { scaffold: "plugin" }, function () {
				anvil.scaffold( sampleScaffold1 );
				test.callback = function () {
					expect( !!filesystem.lib ).to.be.ok();
					expect( !!filesystem.src ).to.be.ok();
					expect( filesystem.src[ "index.js"] ).to.be( sampleScaffold1.output.src[ "index.js" ]);
					done();
				};
				plugin.run( noop );
			});
		});

		it( "should recursively call functions to generate the correct output", function ( done ) {
			plugin.configure({}, { scaffold: "plugin" }, function () {
				anvil.scaffold( sampleScaffold2 );
				test.callback = function () {
					expect( !!filesystem.lib ).to.be.ok();
					expect( !!filesystem.src ).to.be.ok();
					expect( filesystem.src[ "index.js"] ).to.be( sampleScaffold1.output.src[ "index.js" ]);
					done();
				};
				plugin.run( noop );
			});
		});

		it( "should support both sync and async callback methods", function ( done ) {
			plugin.configure({}, { scaffold: "plugin" }, function () {
				anvil.scaffold( sampleScaffold2 );
				test.callback = function () {
					expect( !!filesystem.lib ).to.be.ok();
					expect( !!filesystem.src ).to.be.ok();
					expect( filesystem.src[ "index.js"] ).to.be( sampleScaffold1.output.src[ "index.js" ]);
					done();
				};
				plugin.run( noop );
			});
		});
	});

	it( "the list command should output all scaffolds", function ( done ) {
		hijackConsole();
		plugin.configure({}, { scaffold: "list" }, function () {
			anvil.scaffold( sampleScaffold1 );
			test.callback = function () {
				expect( logOutput ).to.contain( "Currently available scaffolds:" );
				expect( logOutput ).to.contain( "* plugin" );
				expect( logOutput ).to.contain( "An example plugin" );
				restoreConsole();
				done();
			};
			plugin.run( noop );
		});
	});
});