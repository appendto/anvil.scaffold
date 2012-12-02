var prompt = require('prompt');
var shell = require('shelljs');
require('colors');

module.exports = function (_, anvil) {
	var Handlebars = require('handlebars');
	
	// This is a lightweight wrapper around the config
	// formats and exposes a few default methods
	function Scaffold( format ) {
		// This protects private methods and variables
		// from being overwritten
		_.each( _.keys( format ), function ( key ) {
			if ( key.substr(0,1) === "_" ) {
				delete format[ key ];
			}
		});
	
		// Store everything else directly on the scaffold
		_.extend( this, format );
	
		// At the bare minimum, store the scaffold's type for template consumption
		this._viewContext = _.extend( {}, format.data, { type: format.type } );
	}
	
	_.extend( Scaffold.prototype, {
		render: function ( mode, template, filename ) {
			var template = Handlebars.compile(template);
			return template(this._viewContext);
		},
	
		processData: function ( data ) {
			return data;
		},
	
		_processData: function () {
			this._viewContext = this.processData( this._viewContext );
		}
	});

	var exit = function () {
		// Kill the current process, effectively stopping
		// any other plugins from running
		process.exit(0);
	};

	var commands = _.reduce(['scaffold', 'generate', 'gen'], function (acc, value) {
		acc.push([ value + ' [command]', 'generate files and directories for specialized resources' ]);
		return acc;
	}, []);

	var plugin = anvil.plugin({
		name: 'anvil.scaffold',
		activity: 'scaffold',
		currentAction: null,
		currentScaffold: null,
		scaffolds: {},
		commander: commands,
		configure: function (config, command, done) {
			// Normalize the command from any of its aliases
			var action = command.scaffold || command.generate || command.gen;

			// Expose a static method on anvil for defining scaffolds
			anvil.scaffold = function (format) {
				plugin.scaffolds[ format.type ] = new Scaffold( format );
			};

			// Continue if the scaffold option is not used on the command line
			if (!action) {
				done(false);
				return;
			}


			this.currentAction = action;

			// Force scaffolding to run before any other plugin,
			// allowing any plugin to generate a scaffold
			anvil.config.activityOrder.unshift('scaffold');
		
			done();
		},
		walkDirectories: function (format) {
			// Recursively walk over the current format,
			// generating directories where the value is an
			// object or files when the value is a string
			var scaffold = this.currentScaffold;

			_.each(format, function (value, key) {

				// Support a value that is a function. If present
				// the result of the function should be used as the value
				if ( typeof value === "function" ) {
					value = value.call( scaffold, scaffold._viewContext );
				}

				// Allow using template view data in the key as well,
				// which enables templated directory and file names
				var itemName = key;
				if ( scaffold.render ) {
					itemName = scaffold.render.call( scaffold, "name", key );
				}

				if (typeof value === 'object') {
					console.log(('Creating directory: ' + itemName).magenta);
					shell.mkdir('-p', itemName);
					shell.cd(itemName);

					// Generate any nested directories within the current one
					plugin.walkDirectories(value);

					// Once complete with the current directory tree,
					// return to the previous directory
					shell.cd('..');
				} else {
					plugin.writeFile(itemName, value);
				}
			});
		},
		writeFile: function (filename, source) {
			var scaffold = this.currentScaffold;

			// Generate a new file in the current directory by passing
			// a string source through a template method if present
			var content = source;
			if ( scaffold.render ) {
				content = scaffold.render.call( scaffold, "file", source, filename );
			}
			
			// Write the post-processed file to disk
			console.log(('Creating file: ' + filename).magenta);
			content.to(filename);
		},

		list: function () {
			var output = [ "Currently available scaffolds:" ];

			// Find the longest type, so we can line up the descriptions
			var longest = _.max( _.keys( this.scaffolds ), function ( key ) {
				return key.length;
			});

			longest = Math.max( 20, longest.length );

			var padding = (new Array(longest + 1)).join(" ");

			_.each( this.scaffolds, function ( scaffold, type ) {
				var paddedType  = (type + padding).substr(0, longest );
				var description = scaffold.description || "No description provided";
				output.push( "  * " + paddedType + " " + description );
			});

			console.log( "\n" + output.join( "\n" ) );
			exit();
		},

		run: function (done) {
			if ( this.currentAction === "list" ) {
				this.list();
				return;
			}

			this.currentScaffold = plugin.scaffolds[ this.currentAction ];

			if (!this.currentScaffold) {
				done();
				return;
			}

			var scaffold = this.currentScaffold;

			if (!scaffold.output) {
				console.log('This scaffold did not specify any output.'.yellow);
				exit();
			}

			// This scaffold does not require any further user input.
			// Go ahead and generate the file structure.
			if (!scaffold.prompt) {
				scaffold._processData();
				this.walkDirectories(scaffold.output);
				exit();
			}

			// Prompt the user for information needed from the scaffold
			// Change the default style of the prompt, which looks weird
			// if you specify normal questions or descriptions
			prompt.message = '';
			prompt.delimiter = '';

			prompt.start();

			// Automatically extend the view data with any input the user provides at the command prompt
			prompt.addProperties(scaffold._viewContext, scaffold.prompt, function (err) {
				if (err) {
					console.log('\nAn error occurred while trying to fetch user input:'.red);
					console.log(err);
					exit();
				}

				// Generate the file structure now that the view data has
				// been further populated by the user
				scaffold._processData();
				plugin.walkDirectories(scaffold.output);
				exit();
			});
		}
	});

	return plugin;
};